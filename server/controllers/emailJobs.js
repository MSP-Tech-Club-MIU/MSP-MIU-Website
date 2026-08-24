const {
  listAllEmailJobs,
  getEmailJob,
  publicJobView,
  cancelEmailJob
} = require('../services/announcementEmailJob');
const logger = require('../utils/logger');

/**
 * List all email broadcast jobs (active and recent).
 * GET /api/email-jobs
 */
const listEmailJobs = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const status = req.query.status || null;
    const jobs = listAllEmailJobs({ limit, status });
    return res.json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    logger.error('Error listing email jobs:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list email jobs'
    });
  }
};

/**
 * Get detailed email job status.
 * GET /api/email-jobs/:id
 */
const getEmailJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = getEmailJob(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Email job not found'
      });
    }
    return res.json({
      success: true,
      data: publicJobView(job)
    });
  } catch (error) {
    logger.error('Error fetching email job:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch email job'
    });
  }
};

/**
 * Cancel a running email job.
 * POST /api/email-jobs/:id/cancel
 */
const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;
    const cancelled = cancelEmailJob(id);
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Email job not found or already finished'
      });
    }
    return res.json({
      success: true,
      message: 'Email job cancelled successfully',
      data: cancelled
    });
  } catch (error) {
    logger.error('Error cancelling email job:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel email job'
    });
  }
};

module.exports = {
  listEmailJobs,
  getEmailJobById,
  cancelJob
};
