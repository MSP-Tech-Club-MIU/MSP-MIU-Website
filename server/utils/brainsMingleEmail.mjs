/**
 * Email builder for the MSP MIU × BrainsMingle AI Summit 2026 collaboration broadcast.
 * Combines the MSP MIU intro message card with the embedded BrainsMingle AI Summit HTML layout.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { escapeHtml } = require('./emailTemplates/render');

export const BRAINSMINGLE_CTA_URL =
  'https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu';

export const BRAINSMINGLE_PARTNER_CODE = 'MSPMIU';

export const BRAINSMINGLE_SUBJECT =
  'MSP MIU × BrainsMingle: Join the BrainsMingle AI Summit 2026 (Free for Members)';

/**
 * Build the subject, plain-text fallback, and dark-themed HTML body for the BrainsMingle email.
 *
 * @param {object} [options]
 * @param {boolean} [options.testMode=false]
 * @param {string} [options.unsubscribeUrl]
 * @param {string} [options.subject]
 */
export function buildBrainsMingleEmail(options = {}) {
  const {
    testMode = false,
    unsubscribeUrl = null,
    subject: customSubject = null
  } = options;

  const baseSubject = customSubject || BRAINSMINGLE_SUBJECT;
  const subject = testMode ? `[TEST] ${baseSubject}` : baseSubject;

  const unsubHref = unsubscribeUrl ? escapeHtml(unsubscribeUrl) : '#';

  const testBannerHtml = testMode
    ? `<tr>
  <td class="px" style="padding:16px 40px 0 40px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241c08;border:1px solid #F5A623;border-radius:4px;">
      <tr><td style="padding:10px 14px;font-size:12px;color:#F5A623;line-height:1.5;">
        <strong>TEST EMAIL</strong> &middot; MSP MIU &times; BrainsMingle AI Summit 2026 broadcast preview
      </td></tr>
    </table>
  </td>
</tr>`
    : '';

  const baseText = [
    'Hi everyone,',
    '',
    'We’re excited to announce our new collaboration with BrainsMingle and invite you to the BrainsMingle AI Summit 2026, a fully virtual AI event taking place from October 10–16.',
    '',
    `As an MSP member, you can register for free through our partner link and access the event using the ${BRAINSMINGLE_PARTNER_CODE} code.`,
    '',
    'You can find all the event details and registration link below.',
    '',
    '------------------------------------------------------------',
    'BRAINSMINGLE AI SUMMIT 2026 · 10 – 16 OCTOBER 2026',
    'Free to attend · Fully virtual · 50K+ Attendees · 100+ Speakers · 90+ Sessions · 7 Nights',
    '',
    `Partner Code: ${BRAINSMINGLE_PARTNER_CODE}`,
    `Register Free: ${BRAINSMINGLE_CTA_URL}`,
    '',
    'What you will experience:',
    '- Opening night, live: The region’s AI leaders kick off the week on 10 October.',
    '- Your matches: Every night at 10 PM, registered attendees are paired one to one.',
    '- The head start: Connect with speakers and each other in the AI Summit community on BrainsMingle.',
    '- 100+ speakers across five tracks: Answering questions live, all week.',
    '',
    'See you in October.',
    'MSPMIU, official partner of the BrainsMingle AI Summit 2026',
    unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''
  ]
    .filter((line, idx, arr) => !(idx === arr.length - 1 && line === ''))
    .join('\n');

  const text = testMode
    ? ['[TEST — not sent to all members]', '', baseText].join('\n')
    : baseText;

  // Include <!--msp-unsub--> marker so sendEmail() sets List-Unsubscribe headers
  // without appending a duplicate light-mode footer outside the dark layout.
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>AI Summit - mspmiu last call</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:opsz,wght@14..32,400..700&family=JetBrains+Mono:wght@700&family=Reem+Kufi:wght@500;700&display=swap" rel="stylesheet">
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;mso-line-height-rule:exactly}
img{-ms-interpolation-mode:bicubic;border:0;line-height:100%;outline:none;text-decoration:none;display:block}
body{margin:0!important;padding:0!important;width:100%!important;background:#030605}
a{color:#00E39A}
:root{color-scheme:dark}
.cd[data-ogsb],[data-ogsb] .cd{background:#070C0B!important}
.bgp[data-ogsb],[data-ogsb] .bgp{background:#030605!important}
.pnl[data-ogsb],[data-ogsb] .pnl{background:#0A110F!important}
.tw[data-ogsc],[data-ogsc] .tw{color:#FFFFFF!important}
.mt[data-ogsc],[data-ogsc] .mt{color:#00E39A!important}
@media only screen and (max-width:600px){
 .container{width:100%!important}
 .px{padding-left:22px!important;padding-right:22px!important}
 .hero{font-size:27px!important;line-height:33px!important}
 .name{font-size:16px!important}
 .phone{width:130px!important}
 .appcell{padding:18px 14px!important}
}
</style></head><body style="margin:0;padding:0;background:#030605;">
<!-- SUBJECT: Last chance to register free for the AI Summit -->
<!-- PARTNER: mspmiu | TOUCH: lastcall | CODE: MSPMIU | CTA: https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu -->
<!--msp-unsub-->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#030605;font-size:1px;line-height:1px;">We&rsquo;re excited to announce our new collaboration with BrainsMingle and invite you to the BrainsMingle AI Summit 2026 (October 10&ndash;16). Register free with code MSPMIU.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#030605" style="background:#030605;"><tr><td align="center" style="padding:30px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#070C0B" style="width:600px;background:#070C0B;border:1px solid #16241F;">

<!-- TRACK BAR -->
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="20%" height="3" bgcolor="#00E8A2" style="font-size:0;line-height:0;">&nbsp;</td>
<td width="20%" height="3" bgcolor="#F53E9F" style="font-size:0;line-height:0;">&nbsp;</td>
<td width="20%" height="3" bgcolor="#E8F200" style="font-size:0;line-height:0;">&nbsp;</td>
<td width="20%" height="3" bgcolor="#F5A623" style="font-size:0;line-height:0;">&nbsp;</td>
<td width="20%" height="3" bgcolor="#00D4FF" style="font-size:0;line-height:0;">&nbsp;</td>
</tr></table></td></tr>
${testBannerHtml}
<!-- MSP MIU COLLABORATION INTRO -->
<tr><td class="px" bgcolor="#070C0B" style="background:#070C0B;padding:28px 40px 26px 40px;border-bottom:1px solid #16241F;">
<div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:2.5px;color:#00E39A;text-transform:uppercase;">MSP MIU &times; BRAINSMINGLE &middot; NEW COLLABORATION</div>
<p style="margin:14px 0 0 0;font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:15px;line-height:23px;color:#FFFFFF;font-weight:600;">Hi everyone,</p>
<p style="margin:12px 0 0 0;font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:14px;line-height:22px;color:#B6C3BE;">We&rsquo;re excited to announce our new collaboration with <strong style="color:#FFFFFF;">BrainsMingle</strong> and invite you to the <strong style="color:#00E39A;">BrainsMingle AI Summit 2026</strong>, a fully virtual AI event taking place from <strong style="color:#FFFFFF;">October 10&ndash;16</strong>.</p>
<p style="margin:12px 0 0 0;font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:14px;line-height:22px;color:#B6C3BE;">As an MSP member, you can register for free through our <a target="_blank" rel="noopener" href="https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu" style="color:#00E39A;text-decoration:underline;font-weight:600;">partner link</a> and access the event using the <span style="font-family:'JetBrains Mono','Courier New',monospace;color:#00E39A;font-weight:700;letter-spacing:1px;">MSPMIU</span> code.</p>
<p style="margin:12px 0 0 0;font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:14px;line-height:22px;color:#B6C3BE;">You can find all the event details and registration link below.</p>
</td></tr>

<!-- HERO banner -->
<tr><td style="padding:0;font-size:0;line-height:0;"><a target="_blank" rel="noopener" href="https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu" style="display:block;"><img src="https://i.postimg.cc/QdXch8Kf/emails-banner-3.png" width="600" alt="Last call for the BrainsMingle AI Summit 2026. Thousands already registered. Starts 10 October, free and fully virtual." style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>
<!-- LAST CALL BLOCK -->
<tr><td align="center" bgcolor="#070C0B" style="background:#070C0B;padding:30px 40px 34px 40px;"><div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:3px;color:#F5A623;">LAST CALL &middot; STARTS 10 OCTOBER</div><div class="hero" style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:30px;font-weight:800;line-height:36px;letter-spacing:-0.8px;color:#FFFFFF;padding-top:12px;"><b>Thousands are already in.<br><span style="color:#00E39A;">Are you?</span></b></div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:14px;line-height:22px;color:#A9B7B2;padding-top:12px;">The region&rsquo;s AI community meets in days. Make sure you&rsquo;re in the room.</div><table cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0 auto;"><tr><td bgcolor="#00E39A" style="background:#00E39A;border-radius:4px;"><a target="_blank" rel="noopener" href="https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu" class="arch" style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;display:inline-block;padding:15px 44px;font-size:14px;font-weight:600;letter-spacing:1px;color:#03110C;text-decoration:none;"><b>REGISTER NOW</b></a></td></tr></table><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:19px;color:#8D9C97;padding-top:12px;">Free to attend &nbsp;&middot;&nbsp; Fully virtual &nbsp;&middot;&nbsp; Takes under a minute</div></td></tr>

<!-- PROOF -->
<tr><td style="padding:0 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A110F" style="table-layout:fixed;background:#0A110F;border:1px solid #16241F;"><tr><td width="25%" align="center" style="width:25%;padding:14px 0;border-right:1px solid #16241F;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:800;color:#FFFFFF;"><b>50K+</b></div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:10px;letter-spacing:0.8px;color:#7E8F89;padding-top:6px;">ATTENDEES</div></td><td width="25%" align="center" style="width:25%;padding:14px 0;border-right:1px solid #16241F;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:800;color:#FFFFFF;"><b>100+</b></div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:10px;letter-spacing:0.8px;color:#7E8F89;padding-top:6px;">SPEAKERS</div></td><td width="25%" align="center" style="width:25%;padding:14px 0;border-right:1px solid #16241F;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:800;color:#FFFFFF;"><b>90+</b></div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:10px;letter-spacing:0.8px;color:#7E8F89;padding-top:6px;">SESSIONS</div></td><td width="25%" align="center" style="width:25%;padding:14px 0;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:800;color:#FFFFFF;"><b>7</b></div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:10px;letter-spacing:0.8px;color:#7E8F89;padding-top:6px;">NIGHTS</div></td></tr></table></td></tr>

<!-- PARTNER LINE + CODE -->
<tr><td style="padding:16px 40px 0 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#071110" style="background:#071110;border:1px dashed #1E3A33;"><tr><td style="padding:18px 20px;" valign="middle"><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:13.5px;line-height:22px;color:#B6C3BE;">Your <b style="color:#FFFFFF;">MSPMIU</b> code is still on your link. This is the last reminder we&rsquo;ll send, so register through it now to stay on the list for partner offers.</div></td><td width="150" align="center" valign="middle" style="padding:18px 20px 18px 0;"><div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;font-weight:700;letter-spacing:2px;color:#7E8F89;">YOUR CODE</div><div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:20px;font-weight:700;letter-spacing:3px;color:#00E39A;padding-top:6px;"><a target="_blank" rel="noopener" href="https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu" style="color:#00E39A;text-decoration:none;">MSPMIU</a></div></td></tr></table></td></tr>

<tr><td style="padding:30px 40px 0 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1412" style="background:#0B1412;"><tr><td width="3" bgcolor="#00E39A" style="font-size:0;line-height:0;">&nbsp;</td><td class="mono" style="font-family:'JetBrains Mono','Courier New',monospace;padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:2.5px;color:#FFFFFF;"><b>01 &nbsp;IF YOU WAIT</b></td><td align="right" class="kufi" style="font-family:'Reem Kufi','Noto Kufi Arabic','Tajawal',Tahoma,Arial,sans-serif;padding:10px 14px;font-size:13px;color:#8FA09A;" dir="rtl">ما ستفوته</td></tr></table><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:500;line-height:28px;color:#FFFFFF;padding-top:18px;"><b>Here&rsquo;s what you will <span style="color:#F5A623;">miss.</span></b></div><table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top:8px;"><tr><td width="22" valign="top" style="padding:14px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="8" height="8" bgcolor="#F5A623" style="background:#F5A623;font-size:0;line-height:0;">&nbsp;</td></tr></table></td><td valign="top" style="padding:10px 0 12px 0;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;color:#FFFFFF;">Opening night, live</div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:19px;color:#8D9C97;padding-top:3px;">The region&rsquo;s AI leaders kick off the week on 10 October. It happens once.</div></td></tr><tr><td colspan="2" height="1" bgcolor="#14201D" style="font-size:0;line-height:0;">&nbsp;</td></tr><tr><td width="22" valign="top" style="padding:14px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="8" height="8" bgcolor="#F5A623" style="background:#F5A623;font-size:0;line-height:0;">&nbsp;</td></tr></table></td><td valign="top" style="padding:10px 0 12px 0;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;color:#FFFFFF;">Your matches</div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:19px;color:#8D9C97;padding-top:3px;">Every night at 10 PM, registered attendees are paired one to one. No registration, no matches.</div></td></tr><tr><td colspan="2" height="1" bgcolor="#14201D" style="font-size:0;line-height:0;">&nbsp;</td></tr><tr><td width="22" valign="top" style="padding:14px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="8" height="8" bgcolor="#F5A623" style="background:#F5A623;font-size:0;line-height:0;">&nbsp;</td></tr></table></td><td valign="top" style="padding:10px 0 12px 0;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;color:#FFFFFF;">The head start</div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:19px;color:#8D9C97;padding-top:3px;">People are already connecting with speakers and each other in the AI Summit community on BrainsMingle.</div></td></tr><tr><td colspan="2" height="1" bgcolor="#14201D" style="font-size:0;line-height:0;">&nbsp;</td></tr><tr><td width="22" valign="top" style="padding:14px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="8" height="8" bgcolor="#F5A623" style="background:#F5A623;font-size:0;line-height:0;">&nbsp;</td></tr></table></td><td valign="top" style="padding:10px 0 12px 0;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;color:#FFFFFF;">100+ speakers across five tracks</div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:19px;color:#8D9C97;padding-top:3px;">The people building AI in the region, answering questions live, all week.</div></td></tr></table></td></tr>

<!-- THE DATE -->
<tr><td style="padding:30px 40px 0 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A110F" style="background:#0A110F;border:1px solid #16241F;"><tr><td style="padding:20px 22px;" valign="middle"><div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;font-weight:700;letter-spacing:2.5px;color:#7E8F89;">THE ROOM OPENS</div><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:-1px;line-height:1;color:#FFFFFF;padding-top:8px;"><b>10 October</b></div></td><td align="right" valign="middle" style="padding:20px 22px;font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:20px;color:#A9B7B2;">Seven nights<br>Five tracks<br>One room</td></tr></table></td></tr>

<!-- CLOSE -->
<tr><td style="padding:34px 40px 0 40px;"><div style="height:1px;line-height:1px;font-size:0;background:#16241F;">&nbsp;</div></td></tr>
<tr><td align="center" style="padding:26px 40px 0 40px;"><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;font-weight:400;color:#96A5A0;">Everyone else is already in the room. Save your seat.</div><table cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0 auto;"><tr><td bgcolor="#00E39A" style="background:#00E39A;border-radius:4px;"><a target="_blank" rel="noopener" href="https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu" class="arch" style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;display:inline-block;padding:15px 44px;font-size:14px;font-weight:600;letter-spacing:1px;color:#03110C;text-decoration:none;"><b>REGISTER NOW</b></a></td></tr></table><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.3px;color:#00E39A;padding-top:18px;">#CloserThanYouThink &nbsp; #BrainsMingleAISummit</div></td></tr>
<tr><td align="center" style="padding:30px 40px 0 40px;"><div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#E6EDEA;">See you in October.</div><div style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:12px;line-height:19px;color:#8D9C97;padding-top:6px;">MSPMIU, official partner of the BrainsMingle AI Summit 2026</div></td></tr>
<tr><td height="26" style="font-size:0;line-height:26px;">&nbsp;</td></tr>
<tr><td style="padding:18px 40px 28px 40px;border-top:1px solid #16241F;"><div class="inter" style="font-family:'Inter 28pt','Inter',-apple-system,Arial,sans-serif;font-size:11px;line-height:19px;letter-spacing:0.4px;color:#7E8F89;text-align:center;">BrainsMingle AI Summit 2026 &nbsp;&middot;&nbsp; 10 &ndash; 16 October 2026 &nbsp;&middot;&nbsp; Global &middot; Virtual<br><a target="_blank" rel="noopener" href="https://brainsmingle.com/aisummit?utm_source=mspmiu&utm_medium=email&utm_campaign=aisummit_2026&utm_content=lastcall&prtref=mspmiu" style="color:#7E8F89;text-decoration:underline;">brainsmingle.com/AISummit</a> &nbsp;&middot;&nbsp; <a target="_blank" rel="noopener" href="${unsubHref}" style="color:#7E8F89;text-decoration:underline;">Unsubscribe</a></div></td></tr>

</table></td></tr></table></body></html>`;

  return { subject, text, html };
}
