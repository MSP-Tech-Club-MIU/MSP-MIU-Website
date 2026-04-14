const db = require('../config/db');
const crypto = require('crypto');
const path = require('path');
const { normalizeInsertId } = require('../utils/normalizeInsertId');

// Import email templates
const {
    generateNewUserInvitationEmailHTML,
    generateExistingUserInvitationEmailHTML,
    generateNewUserInvitationEmailText,
    generateExistingUserInvitationEmailText,
    getInvitationEmailSubject,
    generateGuestLeaderTeamCreatedEmailHTML,
    generateGuestLeaderTeamCreatedEmailText,
    getGuestLeaderTeamCreatedSubject
} = require('../scripts/teamInvitationEmail');

// Import sendEmail utility (using dynamic import for ESM)
let sendEmail;
(async () => {
    const emailModule = await import('../utils/email.mjs');
    sendEmail = emailModule.sendEmail;
})();

/** Avoid race: first requests may run before the IIFE assigns sendEmail */
async function ensureSendEmail() {
    if (typeof sendEmail === 'function') return sendEmail;
    const emailModule = await import('../utils/email.mjs');
    sendEmail = emailModule.sendEmail;
    return sendEmail;
}

function publicFrontendOrigin() {
    return String(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
}

/**
 * Guest-created teams insert the leader invitation before member invitations.
 * Until a leader row exists in team_members, only that first pending invitation may be accepted.
 */
async function resolveInvitationRoleForAcceptance(invitation) {
    const teamId = invitation.team_id;
    const [leaderRow] = await db.query(
        `SELECT COUNT(*) as c FROM team_members WHERE team_id = ? AND role = 'leader'`,
        {
            replacements: [teamId],
            type: db.QueryTypes.SELECT
        }
    );
    if (Number(leaderRow.c) > 0) {
        return { ok: true, role: 'member', updateTeamCreatedBy: false };
    }

    const [firstPending] = await db.query(
        `SELECT invitation_id FROM team_invitations
         WHERE team_id = ? AND status = 'pending'
         ORDER BY invitation_id ASC
         LIMIT 1`,
        {
            replacements: [teamId],
            type: db.QueryTypes.SELECT
        }
    );

    if (!firstPending || firstPending.invitation_id !== invitation.invitation_id) {
        return {
            ok: false,
            status: 400,
            error: 'The team leader must accept their invitation first. Ask them to check their email, then try your link again.'
        };
    }

    return { ok: true, role: 'leader', updateTeamCreatedBy: true };
}

/**
 * Create a new team for a competition
 * POST /api/teams
 * Public route (no auth required - supports guest team creation)
 */
const createTeam = async (req, res) => {
    try {
        const { competition_id, team_name, leader_name, leader_university_id, leader_email, members = [] } = req.body;

        // Validation
        if (!competition_id || !team_name) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: competition_id, team_name'
            });
        }

        // For guest users (no auth), require leader details
        const isGuest = !req.user;
        if (isGuest) {
            if (!leader_name || !leader_university_id || !leader_email) {
                return res.status(400).json({
                    success: false,
                    error: 'Leader information required: leader_name, leader_university_id, leader_email'
                });
            }

            // Validate MIU email domain
            const miuEmailRegex = /^[^\s@]+@miuegypt\.edu\.eg$/i;
            if (!miuEmailRegex.test(leader_email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Leader email must be a valid @miuegypt.edu.eg address'
                });
            }

            // Validate university ID format
            if (!/^\d{4}\/\d{5}$/.test(leader_university_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid University ID format (must be YYYY/XXXXX, e.g., 2023/98765)'
                });
            }
        }

        // Check if competition exists and is open
        const competitions = await db.query(
            `SELECT competition_id, title, start_at, end_at, status, max_team_size, min_team_size 
             FROM competitions 
             WHERE competition_id = ?`,
            {
                replacements: [competition_id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!competitions || competitions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        const competition = competitions[0];

        if (competition.status !== 'open') {
            return res.status(400).json({
                success: false,
                error: 'Competition is not open for team registration'
            });
        }

        let leaderUserId = null;
        let leaderEmail = leader_email;
        let leaderName = leader_name;
        let leaderUniversityId = leader_university_id;
        let userExists = false;

        // For authenticated users
        if (!isGuest) {
            leaderUserId = req.user.user_id;
            
            // Check if user already has a team for this competition
            const existingTeams = await db.query(
                `SELECT t.team_id, t.team_name
                 FROM teams t
                 INNER JOIN team_members tm ON t.team_id = tm.team_id
                 WHERE t.competition_id = ? AND tm.user_id = ?`,
                {
                    replacements: [competition_id, leaderUserId],
                    type: db.QueryTypes.SELECT
                }
            );

            if (existingTeams && existingTeams.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `You are already a member of team "${existingTeams[0].team_name}"`
                });
            }
        } else {
            // For guest users, check if email exists in users table
            const users = await db.query(
                `SELECT user_id, full_name, university_id FROM users WHERE email = ?`,
                {
                    replacements: [leader_email],
                    type: db.QueryTypes.SELECT
                }
            );

            if (users && users.length > 0) {
                // User exists - use existing user info
                leaderUserId = users[0].user_id;
                userExists = true;
                
                // Check if user already has a team for this competition
                const existingTeams = await db.query(
                    `SELECT t.team_id, t.team_name
                     FROM teams t
                     INNER JOIN team_members tm ON t.team_id = tm.team_id
                     WHERE t.competition_id = ? AND tm.user_id = ?`,
                    {
                        replacements: [competition_id, leaderUserId],
                        type: db.QueryTypes.SELECT
                    }
                );

                if (existingTeams && existingTeams.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `This email is already a member of team "${existingTeams[0].team_name}"`
                    });
                }
            }
            // If user doesn't exist, leaderUserId remains null (team will be pending)
        }

        // Check if team name already exists for this competition
        const duplicateTeams = await db.query(
            `SELECT team_id FROM teams 
             WHERE competition_id = ? AND team_name = ?`,
            {
                replacements: [competition_id, team_name],
                type: db.QueryTypes.SELECT
            }
        );

        if (duplicateTeams && duplicateTeams.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Team name already exists for this competition'
            });
        }

        if (!Array.isArray(members)) {
            return res.status(400).json({
                success: false,
                error: 'members must be an array'
            });
        }

        // Validate submitted team size against competition constraints.
        // Leader counts as 1 member.
        const normalizedMembers = members.filter((member) => (
            member &&
            typeof member === 'object' &&
            String(member.name || '').trim() &&
            String(member.university_id || '').trim() &&
            String(member.email || '').trim()
        ));
        const submittedTeamSize = 1 + normalizedMembers.length;

        if (submittedTeamSize < competition.min_team_size) {
            return res.status(400).json({
                success: false,
                error: `Team must have at least ${competition.min_team_size} member(s). You submitted ${submittedTeamSize}.`
            });
        }

        if (submittedTeamSize > competition.max_team_size) {
            return res.status(400).json({
                success: false,
                error: `Team cannot exceed ${competition.max_team_size} member(s). You submitted ${submittedTeamSize}.`
            });
        }

        // Create team (created_by_user_id can be NULL for pending teams)
        const teamResult = await db.query(
            `INSERT INTO teams (competition_id, team_name, created_by_user_id, is_locked)
             VALUES (?, ?, ?, ?)`,
            {
                replacements: [competition_id, team_name, leaderUserId, false],
                type: db.QueryTypes.INSERT
            }
        );

        const teamId = normalizeInsertId(teamResult);
        if (teamId == null) {
            throw new Error('Failed to resolve new team id after insert');
        }

        // If leader user exists, add them as team leader
        if (leaderUserId) {
            await db.query(
                `INSERT INTO team_members (team_id, user_id, role)
                 VALUES (?, ?, ?)`,
                {
                    replacements: [teamId, leaderUserId, 'leader'],
                    type: db.QueryTypes.INSERT
                }
            );

            // Guest + email already in users DB: they don't get an activation link — send team confirmation
            if (isGuest && userExists && leaderEmail) {
                try {
                    const mail = await ensureSendEmail();
                    if (mail) {
                        const baseUrl = publicFrontendOrigin();
                        const competitionUrl = `${baseUrl}/competitions/${competition_id}`;
                        const workspaceUrl = `${baseUrl}/competitions/${competition_id}/team/${teamId}`;
                        const fmt = (d) => new Date(d).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        const leaderCreatedPayload = {
                            teamName: team_name,
                            competitionTitle: competition.title,
                            competitionStartDate: fmt(competition.start_at),
                            competitionEndDate: fmt(competition.end_at),
                            competitionUrl,
                            workspaceUrl,
                            email: leaderEmail
                        };
                        await mail({
                            to: leaderEmail,
                            fromName: 'MSP MIU - Competitions',
                            subject: getGuestLeaderTeamCreatedSubject(team_name, competition.title),
                            text: generateGuestLeaderTeamCreatedEmailText(leaderCreatedPayload),
                            html: generateGuestLeaderTeamCreatedEmailHTML(leaderCreatedPayload)
                        });
                        console.log(`✅ Guest leader team-created email sent to ${leaderEmail}`);
                    }
                } catch (emailErr) {
                    console.error('Failed to send guest leader team-created email:', emailErr);
                }
            }
        } else {
            // User doesn't exist - create an invitation for the leader to create their account
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            await db.query(
                `INSERT INTO team_invitations 
                 (team_id, invited_email, invited_user_id, invited_name, invited_university_id, token, expires_at, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                {
                    replacements: [teamId, leader_email, null, leader_name, leader_university_id, token, expiresAt, 'pending'],
                    type: db.QueryTypes.INSERT
                }
            );

            // Get competition details for email
            const competitionUrl = `${publicFrontendOrigin()}/competitions/${competition_id}`;
            const emailData = {
                teamName: team_name,
                inviterName: leader_name,
                competitionTitle: competition.title || 'Competition',
                competitionStartDate: new Date(competition.start_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                competitionEndDate: new Date(competition.end_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                invitationToken: token,
                acceptUrl: publicFrontendOrigin(),
                competitionUrl,
                expiresAt: expiresAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                email: leader_email,
                invitedName: leader_name,
                invitedUniversityId: leader_university_id
            };

            // Send leader invitation email (new user — create account + join as leader)
            try {
                const mail = await ensureSendEmail();
                if (mail) {
                    const htmlContent = generateNewUserInvitationEmailHTML(emailData);
                    const textContent = generateNewUserInvitationEmailText(emailData);

                    await mail({
                        to: leader_email,
                        fromName: 'MSP MIU - Competitions',
                        subject: `🎯 Team Leader Invitation: Create Account for "${team_name}" - MSP MIU`,
                        text: textContent,
                        html: htmlContent
                    });

                    console.log(`✅ Team leader invitation email sent to ${leader_email} (new user)`);
                } else {
                    console.warn('sendEmail unavailable: leader invitation not sent');
                }
            } catch (emailError) {
                console.error('Failed to send leader invitation email:', emailError);
            }
        }

        // Process initial member invitations/additions from team creation form
        // This supports guest team creation without requiring authenticated invite endpoint.
        if (normalizedMembers.length > 0) {
            const miuEmailRegex = /^[^\s@]+@miuegypt\.edu\.eg$/i;
            const universityIdRegex = /^\d{4}\/\d{5}$/;
            const competitionUrl = `${publicFrontendOrigin()}/competitions/${competition_id}`;

            for (const member of normalizedMembers) {
                const memberEmail = (member?.email || '').trim().toLowerCase();
                const memberName = (member?.name || '').trim();
                const memberUniversityId = (member?.university_id || '').trim();

                // Skip malformed or duplicate-with-leader entries defensively.
                if (!memberEmail || !memberName || !memberUniversityId) continue;
                if (!miuEmailRegex.test(memberEmail) || !universityIdRegex.test(memberUniversityId)) continue;
                if (leaderEmail && memberEmail === String(leaderEmail).toLowerCase()) continue;

                // Skip if already in a competition team.
                const existingCompetitionMembers = await db.query(
                    `SELECT tm.team_member_id
                     FROM team_members tm
                     INNER JOIN users u ON tm.user_id = u.user_id
                     INNER JOIN teams t ON tm.team_id = t.team_id
                     WHERE t.competition_id = ? AND u.email = ?`,
                    {
                        replacements: [competition_id, memberEmail],
                        type: db.QueryTypes.SELECT
                    }
                );
                if (existingCompetitionMembers && existingCompetitionMembers.length > 0) continue;

                // Skip if pending invitation already exists for this team/email.
                const existingPendingInvite = await db.query(
                    `SELECT invitation_id
                     FROM team_invitations
                     WHERE team_id = ? AND invited_email = ? AND status = 'pending'`,
                    {
                        replacements: [teamId, memberEmail],
                        type: db.QueryTypes.SELECT
                    }
                );
                if (existingPendingInvite && existingPendingInvite.length > 0) continue;

                const users = await db.query(
                    `SELECT user_id FROM users WHERE email = ?`,
                    {
                        replacements: [memberEmail],
                        type: db.QueryTypes.SELECT
                    }
                );
                const memberUserId = users && users.length > 0 ? users[0].user_id : null;
                const memberUserExists = !!memberUserId;

                if (memberUserExists) {
                    await db.query(
                        `INSERT INTO team_members (team_id, user_id, role)
                         VALUES (?, ?, ?)`,
                        {
                            replacements: [teamId, memberUserId, 'member'],
                            type: db.QueryTypes.INSERT
                        }
                    );

                    await db.query(
                        `UPDATE users
                         SET role = 'competitor'
                         WHERE user_id = ? AND role = 'member'`,
                        {
                            replacements: [memberUserId],
                            type: db.QueryTypes.UPDATE
                        }
                    );

                    try {
                        const mail = await ensureSendEmail();
                        if (!mail) continue;
                        const existingEmailData = {
                            teamName: team_name,
                            inviterName: leaderName || leader_name || 'Team Leader',
                            competitionTitle: competition.title,
                            competitionStartDate: new Date(competition.start_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }),
                            competitionEndDate: new Date(competition.end_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }),
                            competitionUrl,
                            expiresAt: null,
                            email: memberEmail
                        };

                            await mail({
                                to: memberEmail,
                                fromName: 'MSP MIU - Competitions',
                                subject: getInvitationEmailSubject(team_name, competition.title, true),
                                text: generateExistingUserInvitationEmailText(existingEmailData),
                                html: generateExistingUserInvitationEmailHTML(existingEmailData)
                            });
                    } catch (emailErr) {
                        console.error('Failed to send member notification email (existing user):', emailErr);
                    }
                } else {
                    const token = crypto.randomBytes(32).toString('hex');
                    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                    await db.query(
                        `INSERT INTO team_invitations 
                         (team_id, invited_email, invited_user_id, invited_name, invited_university_id, token, expires_at, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        {
                            replacements: [teamId, memberEmail, null, memberName, memberUniversityId, token, expiresAt, 'pending'],
                            type: db.QueryTypes.INSERT
                        }
                    );

                    try {
                        const mail = await ensureSendEmail();
                        if (!mail) continue;
                        const newUserEmailData = {
                            teamName: team_name,
                            inviterName: leaderName || leader_name || 'Team Leader',
                            competitionTitle: competition.title,
                            competitionStartDate: new Date(competition.start_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }),
                            competitionEndDate: new Date(competition.end_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }),
                            invitationToken: token,
                            acceptUrl: publicFrontendOrigin(),
                            competitionUrl,
                            expiresAt: expiresAt.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }),
                            email: memberEmail,
                            invitedName: memberName,
                            invitedUniversityId: memberUniversityId
                        };

                            await mail({
                                to: memberEmail,
                                fromName: 'MSP MIU - Competitions',
                                subject: getInvitationEmailSubject(team_name, competition.title, false),
                                text: generateNewUserInvitationEmailText(newUserEmailData),
                                html: generateNewUserInvitationEmailHTML(newUserEmailData)
                            });
                    } catch (emailErr) {
                        console.error('Failed to send member invitation email (new user):', emailErr);
                    }
                }
            }
        }

        // Fetch the created team with member count (avoid GROUP BY + t.* issues on strict MySQL)
        const newTeams = await db.query(
            `SELECT t.*, (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS member_count
             FROM teams t
             WHERE t.team_id = ?`,
            {
                replacements: [teamId],
                type: db.QueryTypes.SELECT
            }
        );

        const teamPayload = newTeams && newTeams[0] ? newTeams[0] : { team_id: teamId };

        res.status(201).json({
            success: true,
            message: leaderUserId ? 'Team created successfully' : 'Team created! Check your email to activate your account.',
            data: {
                ...teamPayload,
                pending_leader_activation: !leaderUserId
            }
        });

    } catch (error) {
        console.error('Error creating team:', error);

        // Convert common DB constraint issues into user-friendly responses.
        const sqlCode = error?.original?.code || error?.parent?.code;
        if (
            error?.name === 'SequelizeUniqueConstraintError' ||
            sqlCode === 'ER_DUP_ENTRY'
        ) {
            return res.status(400).json({
                success: false,
                error: 'One of the provided emails/university IDs is already assigned in a conflicting way. Please review team members and try again.'
            });
        }

        if (error?.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'Some provided member data is invalid or no longer available. Please refresh and try again.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create team',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * Get team by ID with members
 * GET /api/teams/:id
 * Authenticated — team members or admin/board
 */
const getTeamById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const isPrivileged = ['admin', 'board'].includes(req.user.role);

        const teams = await db.query(
            `SELECT t.*, c.title as competition_title, c.max_team_size, c.min_team_size
             FROM teams t
             INNER JOIN competitions c ON t.competition_id = c.competition_id
             WHERE t.team_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!teams || teams.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }

        if (!isPrivileged) {
            const membership = await db.query(
                `SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1`,
                {
                    replacements: [id, userId],
                    type: db.QueryTypes.SELECT
                }
            );
            if (!membership || membership.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }
        }

        // Get team members
        const members = await db.query(
            `SELECT tm.team_member_id, tm.role, tm.joined_at,
                    u.user_id, u.full_name, u.email, u.profile_picture
             FROM team_members tm
             INNER JOIN users u ON tm.user_id = u.user_id
             WHERE tm.team_id = ?
             ORDER BY tm.role DESC, tm.joined_at ASC`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        const team = teams[0];
        team.members = members;

        res.status(200).json({
            success: true,
            data: team
        });

    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team'
        });
    }
};

/**
 * Get teams for a competition
 * GET /api/competitions/:competitionId/teams
 * Public route
 */
const getCompetitionTeams = async (req, res) => {
    try {
        const { competitionId } = req.params;

        const teams = await db.query(
            `SELECT t.team_id, t.team_name, t.is_locked, t.created_at,
                    COUNT(tm.team_member_id) as member_count,
                    u.full_name as creator_name
             FROM teams t
             LEFT JOIN users u ON t.created_by_user_id = u.user_id
             LEFT JOIN team_members tm ON t.team_id = tm.team_id
             WHERE t.competition_id = ?
             GROUP BY t.team_id
             ORDER BY t.created_at DESC`,
            {
                replacements: [competitionId],
                type: db.QueryTypes.SELECT
            }
        );

        res.status(200).json({
            success: true,
            data: teams
        });

    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch teams'
        });
    }
};

/**
 * Send team invitation
 * POST /api/teams/:id/invite
 * Authenticated route (team leader only)
 */
const inviteToTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, university_id } = req.body;
        const userId = req.user.user_id;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Validate MIU email domain
        const miuEmailRegex = /^[^\s@]+@miuegypt\.edu\.eg$/i;
        if (!miuEmailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Only @miuegypt.edu.eg email addresses are allowed'
            });
        }

        // Validate university ID if provided
        if (university_id && !/^\d{4}\/\d{5}$/.test(university_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid University ID format (must be YYYY/XXXXX, e.g., 2023/98765)'
            });
        }

        // Check if user is team leader
        const teamMembers = await db.query(
            `SELECT tm.role, t.team_name, t.is_locked, t.competition_id,
                    c.max_team_size,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.team_id) as current_size
             FROM team_members tm
             INNER JOIN teams t ON tm.team_id = t.team_id
             INNER JOIN competitions c ON t.competition_id = c.competition_id
             WHERE tm.team_id = ? AND tm.user_id = ?`,
            {
                replacements: [id, userId],
                type: db.QueryTypes.SELECT
            }
        );

        if (!teamMembers || teamMembers.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You are not a member of this team'
            });
        }

        const membership = teamMembers[0];

        if (membership.role !== 'leader') {
            return res.status(403).json({
                success: false,
                error: 'Only team leader can send invitations'
            });
        }

        if (membership.is_locked) {
            return res.status(400).json({
                success: false,
                error: 'Team is locked and cannot accept new members'
            });
        }

        if (membership.current_size >= membership.max_team_size) {
            return res.status(400).json({
                success: false,
                error: 'Team is full'
            });
        }

        // Check if email is already a team member
        const existingMembers = await db.query(
            `SELECT tm.team_member_id
             FROM team_members tm
             INNER JOIN users u ON tm.user_id = u.user_id
             INNER JOIN teams t ON tm.team_id = t.team_id
             WHERE t.competition_id = ? AND u.email = ?`,
            {
                replacements: [membership.competition_id, email],
                type: db.QueryTypes.SELECT
            }
        );

        if (existingMembers && existingMembers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User is already in a team for this competition'
            });
        }

        // Check if invitation already sent
        const existingInvitations = await db.query(
            `SELECT invitation_id, status
             FROM team_invitations
             WHERE team_id = ? AND invited_email = ? AND status = 'pending'`,
            {
                replacements: [id, email],
                type: db.QueryTypes.SELECT
            }
        );

        if (existingInvitations && existingInvitations.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invitation already sent to this email'
            });
        }

        // Get user_id and role if user exists
        const users = await db.query(
            `SELECT user_id, role FROM users WHERE email = ?`,
            {
                replacements: [email],
                type: db.QueryTypes.SELECT
            }
        );

        const invitedUserId = users && users.length > 0 ? users[0].user_id : null;
        const userExists = invitedUserId !== null;

        let token = null;
        let expiresAt = null;
        let invitationResult = null;

        // Existing account: add directly to team and notify
        if (userExists) {
            await db.query(
                `INSERT INTO team_members (team_id, user_id, role)
                 VALUES (?, ?, ?)`,
                {
                    replacements: [id, invitedUserId, 'member'],
                    type: db.QueryTypes.INSERT
                }
            );

            // Ensure normal members invited to competitions can access competitor dashboard
            await db.query(
                `UPDATE users
                 SET role = 'competitor'
                 WHERE user_id = ? AND role = 'member'`,
                {
                    replacements: [invitedUserId],
                    type: db.QueryTypes.UPDATE
                }
            );
        } else {
            // New account: create invitation token and email password-setup flow
            token = crypto.randomBytes(32).toString('hex');
            expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            invitationResult = await db.query(
                `INSERT INTO team_invitations 
                 (team_id, invited_email, invited_user_id, invited_name, invited_university_id, token, expires_at, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                {
                    replacements: [id, email, invitedUserId, name || null, university_id || null, token, expiresAt, 'pending'],
                    type: db.QueryTypes.INSERT
                }
            );
        }

        // Get team and competition details for email
        const teamDetails = await db.query(
            `SELECT t.team_name, c.title, c.start_at, c.end_at,
                    COALESCE(u.full_name, ul.full_name, 'Team Leader') as inviter_name
             FROM teams t
             INNER JOIN competitions c ON t.competition_id = c.competition_id
             LEFT JOIN users u ON t.created_by_user_id = u.user_id
             LEFT JOIN team_members tml ON tml.team_id = t.team_id AND tml.role = 'leader'
             LEFT JOIN users ul ON tml.user_id = ul.user_id
             WHERE t.team_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!teamDetails || teamDetails.length === 0) {
            throw new Error('Team details not found');
        }

        const details = teamDetails[0];
        
        // Format dates
        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        // Prepare email data
        const emailData = {
            teamName: details.team_name,
            inviterName: details.inviter_name,
            competitionTitle: details.title,
            competitionStartDate: formatDate(details.start_at),
            competitionEndDate: formatDate(details.end_at),
            invitationToken: token,
            acceptUrl: publicFrontendOrigin(),
            competitionUrl: `${publicFrontendOrigin()}/competitions/${membership.competition_id}`,
            expiresAt: expiresAt ? formatDate(expiresAt) : null,
            email: email
        };

        // Add invitation details for new users
        if (!userExists) {
            emailData.invitedName = name;
            emailData.invitedUniversityId = university_id;
        }

        // Generate email HTML and text based on user existence
        let htmlContent, textContent;
        
        if (userExists) {
            htmlContent = generateExistingUserInvitationEmailHTML(emailData);
            textContent = generateExistingUserInvitationEmailText(emailData);
        } else {
            htmlContent = generateNewUserInvitationEmailHTML(emailData);
            textContent = generateNewUserInvitationEmailText(emailData);
        }

        // Send email
        try {
            const mail = await ensureSendEmail();
            if (mail) {
                await mail({
                    to: email,
                    fromName: 'MSP MIU - Competitions',
                    subject: getInvitationEmailSubject(details.team_name, details.title, userExists),
                    text: textContent,
                    html: htmlContent
                });

                console.log(`✅ Team invitation email sent to ${email} (${userExists ? 'existing' : 'new'} user)`);
            } else {
                console.warn('⚠️  sendEmail not available, email not sent');
            }
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // Don't fail the whole operation if email sending fails
        }

        res.status(201).json({
            success: true,
            message: userExists ? 'Member added to team and notified successfully' : 'Invitation sent successfully',
            data: {
                invitation_id: invitationResult,
                email: email,
                token: token,
                expires_at: expiresAt,
                user_exists: userExists
            }
        });

    } catch (error) {
        console.error('Error sending invitation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send invitation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Accept team invitation
 * POST /api/teams/invitations/:token/accept
 * Authenticated route
 */
const acceptInvitation = async (req, res) => {
    try {
        const token = req.params.token || req.body.token;
        const userId = req.user.user_id;
        const userEmail = req.user.email;

        // Get invitation
        const invitations = await db.query(
            `SELECT i.*, t.competition_id, t.is_locked,
                    c.max_team_size,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = i.team_id) as current_size
             FROM team_invitations i
             INNER JOIN teams t ON i.team_id = t.team_id
             INNER JOIN competitions c ON t.competition_id = c.competition_id
             WHERE i.token = ?`,
            {
                replacements: [token],
                type: db.QueryTypes.SELECT
            }
        );

        if (!invitations || invitations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invitation not found'
            });
        }

        const invitation = invitations[0];

        if (String(invitation.invited_email).toLowerCase() !== String(userEmail).toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'This invitation was sent to a different email address'
            });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Invitation is ${invitation.status}`
            });
        }

        if (new Date() > new Date(invitation.expires_at)) {
            await db.query(
                `UPDATE team_invitations SET status = 'expired' WHERE invitation_id = ?`,
                {
                    replacements: [invitation.invitation_id],
                    type: db.QueryTypes.UPDATE
                }
            );
            return res.status(400).json({
                success: false,
                error: 'Invitation has expired'
            });
        }

        if (invitation.is_locked) {
            return res.status(400).json({
                success: false,
                error: 'Team is locked'
            });
        }

        if (invitation.current_size >= invitation.max_team_size) {
            return res.status(400).json({
                success: false,
                error: 'Team is full'
            });
        }

        // Check if user is already in a team for this competition
        const existingMemberships = await db.query(
            `SELECT t.team_id, t.team_name
             FROM team_members tm
             INNER JOIN teams t ON tm.team_id = t.team_id
             WHERE t.competition_id = ? AND tm.user_id = ?`,
            {
                replacements: [invitation.competition_id, userId],
                type: db.QueryTypes.SELECT
            }
        );

        if (existingMemberships && existingMemberships.length > 0) {
            return res.status(400).json({
                success: false,
                error: `You are already in team "${existingMemberships[0].team_name}"`
            });
        }

        const rolePlan = await resolveInvitationRoleForAcceptance(invitation);
        if (!rolePlan.ok) {
            return res.status(rolePlan.status).json({
                success: false,
                error: rolePlan.error
            });
        }

        // Add user to team
        await db.query(
            `INSERT INTO team_members (team_id, user_id, role)
             VALUES (?, ?, ?)`,
            {
                replacements: [invitation.team_id, userId, rolePlan.role],
                type: db.QueryTypes.INSERT
            }
        );

        if (rolePlan.updateTeamCreatedBy) {
            await db.query(
                `UPDATE teams SET created_by_user_id = ? WHERE team_id = ?`,
                {
                    replacements: [userId, invitation.team_id],
                    type: db.QueryTypes.UPDATE
                }
            );
        }

        // Update invitation status
        await db.query(
            `UPDATE team_invitations 
             SET status = 'accepted', responded_at = NOW()
             WHERE invitation_id = ?`,
            {
                replacements: [invitation.invitation_id],
                type: db.QueryTypes.UPDATE
            }
        );

        res.status(200).json({
            success: true,
            message: 'Invitation accepted successfully',
            data: {
                team_id: invitation.team_id
            }
        });

    } catch (error) {
        console.error('Error accepting invitation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to accept invitation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Decline team invitation
 * POST /api/teams/invitations/:token/decline
 * Authenticated route
 */
const declineInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const userEmail = req.user.email;

        const invitations = await db.query(
            `SELECT * FROM team_invitations WHERE token = ?`,
            {
                replacements: [token],
                type: db.QueryTypes.SELECT
            }
        );

        if (!invitations || invitations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invitation not found'
            });
        }

        const invitation = invitations[0];

        if (String(invitation.invited_email).toLowerCase() !== String(userEmail).toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'This invitation was sent to a different email address'
            });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Invitation is already ${invitation.status}`
            });
        }

        await db.query(
            `UPDATE team_invitations 
             SET status = 'declined', responded_at = NOW()
             WHERE invitation_id = ?`,
            {
                replacements: [invitation.invitation_id],
                type: db.QueryTypes.UPDATE
            }
        );

        res.status(200).json({
            success: true,
            message: 'Invitation declined'
        });

    } catch (error) {
        console.error('Error declining invitation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to decline invitation'
        });
    }
};

/**
 * Verify team invitation token
 * GET /api/teams/verify-invitation?token=xxx
 * Public route (no auth required)
 */
const verifyInvitation = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        // Get invitation details
        const invitations = await db.query(
            `SELECT i.*, t.team_name, c.title as competition_title,
                    COALESCE(
                        u.full_name,
                        (SELECT ti2.invited_name FROM team_invitations ti2
                         WHERE ti2.team_id = t.team_id ORDER BY ti2.invitation_id ASC LIMIT 1)
                    ) as inviter_name
             FROM team_invitations i
             INNER JOIN teams t ON i.team_id = t.team_id
             INNER JOIN competitions c ON t.competition_id = c.competition_id
             LEFT JOIN users u ON t.created_by_user_id = u.user_id
             WHERE i.token = ?`,
            {
                replacements: [token],
                type: db.QueryTypes.SELECT
            }
        );

        if (!invitations || invitations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invitation not found'
            });
        }

        const invitation = invitations[0];

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Invitation is ${invitation.status}`
            });
        }

        if (new Date() > new Date(invitation.expires_at)) {
            await db.query(
                `UPDATE team_invitations SET status = 'expired' WHERE invitation_id = ?`,
                {
                    replacements: [invitation.invitation_id],
                    type: db.QueryTypes.UPDATE
                }
            );

            return res.status(400).json({
                success: false,
                error: 'Invitation has expired'
            });
        }

        // Check if user exists
        const users = await db.query(
            `SELECT user_id FROM users WHERE email = ?`,
            {
                replacements: [invitation.invited_email],
                type: db.QueryTypes.SELECT
            }
        );

        const userExists = users && users.length > 0;

        res.json({
            success: true,
            data: {
                team_name: invitation.team_name,
                competition_title: invitation.competition_title,
                inviter_name: invitation.inviter_name,
                invited_email: invitation.invited_email,
                email: invitation.invited_email,
                invited_name: invitation.invited_name,
                invited_university_id: invitation.invited_university_id,
                expires_at: invitation.expires_at,
                userExists: userExists
            }
        });

    } catch (error) {
        console.error('Error verifying invitation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify invitation'
        });
    }
};

/**
 * Accept team invitation for NEW user (creates account with password)
 * POST /api/teams/accept-invitation-new-user
 * Public route (no auth required)
 */
const acceptInvitationNewUser = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                error: 'Token and password are required'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Get invitation
        const invitations = await db.query(
            `SELECT i.*, t.competition_id, t.is_locked,
                    c.max_team_size,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = i.team_id) as current_size
             FROM team_invitations i
             INNER JOIN teams t ON i.team_id = t.team_id
             INNER JOIN competitions c ON t.competition_id = c.competition_id
             WHERE i.token = ?`,
            {
                replacements: [token],
                type: db.QueryTypes.SELECT
            }
        );

        if (!invitations || invitations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invitation not found'
            });
        }

        const invitation = invitations[0];

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Invitation is ${invitation.status}`
            });
        }

        if (new Date() > new Date(invitation.expires_at)) {
            await db.query(
                `UPDATE team_invitations SET status = 'expired' WHERE invitation_id = ?`,
                {
                    replacements: [invitation.invitation_id],
                    type: db.QueryTypes.UPDATE
                }
            );

            return res.status(400).json({
                success: false,
                error: 'Invitation has expired'
            });
        }

        if (invitation.is_locked) {
            return res.status(400).json({
                success: false,
                error: 'Team is locked'
            });
        }

        if (invitation.current_size >= invitation.max_team_size) {
            return res.status(400).json({
                success: false,
                error: 'Team is full'
            });
        }

        // Check if user already exists
        const existingUsers = await db.query(
            `SELECT user_id FROM users WHERE email = ?`,
            {
                replacements: [invitation.invited_email],
                type: db.QueryTypes.SELECT
            }
        );

        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User already exists. Please log in instead.'
            });
        }

        if (invitation.invited_university_id) {
            const existingUniversityId = await db.query(
                `SELECT user_id FROM users WHERE university_id = ?`,
                {
                    replacements: [invitation.invited_university_id],
                    type: db.QueryTypes.SELECT
                }
            );
            if (existingUniversityId && existingUniversityId.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'This university ID is already registered. Please log in or contact support.'
                });
            }
        }

        const rolePlan = await resolveInvitationRoleForAcceptance(invitation);
        if (!rolePlan.ok) {
            return res.status(rolePlan.status).json({
                success: false,
                error: rolePlan.error
            });
        }

        // Hash password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user account with 'competitor' role
        const userResult = await db.query(
            `INSERT INTO users (full_name, university_id, email, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    invitation.invited_name || 'Competitor',
                    invitation.invited_university_id || null,
                    invitation.invited_email,
                    hashedPassword,
                    'competitor',
                    true
                ],
                type: db.QueryTypes.INSERT
            }
        );

        const newUserId = normalizeInsertId(userResult);
        if (newUserId == null) {
            throw new Error('Failed to resolve new user id after insert');
        }

        // Add user to team
        await db.query(
            `INSERT INTO team_members (team_id, user_id, role)
             VALUES (?, ?, ?)`,
            {
                replacements: [invitation.team_id, newUserId, rolePlan.role],
                type: db.QueryTypes.INSERT
            }
        );

        if (rolePlan.updateTeamCreatedBy) {
            await db.query(
                `UPDATE teams SET created_by_user_id = ? WHERE team_id = ?`,
                {
                    replacements: [newUserId, invitation.team_id],
                    type: db.QueryTypes.UPDATE
                }
            );
        }

        // Update invitation status
        await db.query(
            `UPDATE team_invitations SET status = 'accepted', invited_user_id = ? WHERE invitation_id = ?`,
            {
                replacements: [newUserId, invitation.invitation_id],
                type: db.QueryTypes.UPDATE
            }
        );

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const authToken = jwt.sign(
            {
                user_id: newUserId,
                email: invitation.invited_email,
                role: 'competitor'
            },
            process.env.JWT_SECRET || 'default-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Account created and team joined successfully',
            token: authToken,
            data: {
                user_id: newUserId,
                email: invitation.invited_email,
                name: invitation.invited_name,
                role: 'competitor'
            }
        });

    } catch (error) {
        console.error('Error accepting invitation (new user):', error);
        const sqlCode = error?.original?.code || error?.parent?.code;
        if (sqlCode === 'ER_DUP_ENTRY' || error?.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'This invitation email or university ID is already linked to an account. Please log in or reset your password.'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to accept invitation',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

module.exports = {
    createTeam,
    getTeamById,
    getCompetitionTeams,
    inviteToTeam,
    acceptInvitation,
    declineInvitation,
    verifyInvitation,
    acceptInvitationNewUser
};
