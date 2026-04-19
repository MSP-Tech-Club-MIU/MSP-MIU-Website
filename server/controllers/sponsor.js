const { Sponsor } = require('../models');

const getAllSponsors = async (req, res) => {
  try {
    const sponsors = await Sponsor.findAll({
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ]
    });
    res.status(200).json({
      success: true,
      data: sponsors,
      count: sponsors.length
    });
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sponsors'
    });
  }
};

module.exports = {
  getAllSponsors
};
