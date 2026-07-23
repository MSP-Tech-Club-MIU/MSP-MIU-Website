const { Sponsor } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');

const getAllSponsors = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const seasonFilter = await resolveSeasonFilter(req.query);
    const where = { ...seasonFilter.where };
    const include = [];
    if (seasonFilter.includeSeason) {
      include.push(seasonInclude());
    }

    const { rows: sponsors, count: total } = await Sponsor.findAndCountAll({
      where,
      include,
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ],
      limit,
      offset,
      distinct: true
    });
    res.status(200).json({
      success: true,
      data: sponsors,
      count: sponsors.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error fetching sponsors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sponsors'
    });
  }
};

const createSponsor = async (req, res) => {
  try {
    const {
      name,
      logo_url,
      website_url,
      social_links,
      tagline,
      description,
      tier,
      sort_order
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    let socialLinksValue = social_links;
    if (social_links && typeof social_links === 'object') {
      socialLinksValue = JSON.stringify(social_links);
    }

    const season_id = await resolveSeasonIdForWrite(req.body, req.query);

    const sponsor = await Sponsor.create({
      name: String(name).trim(),
      logo_url: logo_url || null,
      website_url: website_url || null,
      social_links: socialLinksValue || null,
      tagline: tagline || null,
      description: description || null,
      tier: tier || null,
      sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      season_id
    });

    res.status(201).json({ success: true, data: sponsor });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error creating sponsor:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create sponsor' });
  }
};

const updateSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const sponsor = await Sponsor.findByPk(id);
    if (!sponsor) {
      return res.status(404).json({ success: false, error: 'Sponsor not found' });
    }

    const {
      name,
      logo_url,
      website_url,
      social_links,
      tagline,
      description,
      tier,
      sort_order
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (logo_url !== undefined) updates.logo_url = logo_url || null;
    if (website_url !== undefined) updates.website_url = website_url || null;
    if (social_links !== undefined) {
      updates.social_links =
        social_links && typeof social_links === 'object'
          ? JSON.stringify(social_links)
          : social_links || null;
    }
    if (tagline !== undefined) updates.tagline = tagline || null;
    if (description !== undefined) updates.description = description || null;
    if (tier !== undefined) updates.tier = tier || null;
    if (sort_order !== undefined) {
      updates.sort_order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0;
    }
    if (req.body.season_id !== undefined) {
      updates.season_id = await resolveSeasonIdForWrite(req.body, req.query);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await sponsor.update(updates);
    await sponsor.reload();
    res.json({ success: true, data: sponsor });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error updating sponsor:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update sponsor' });
  }
};

const deleteSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const sponsor = await Sponsor.findByPk(id);
    if (!sponsor) {
      return res.status(404).json({ success: false, error: 'Sponsor not found' });
    }
    await sponsor.destroy();
    res.json({ success: true, message: 'Sponsor deleted' });
  } catch (error) {
    console.error('Error deleting sponsor:', error);
    res.status(500).json({ success: false, error: 'Failed to delete sponsor' });
  }
};

module.exports = {
  getAllSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor
};
