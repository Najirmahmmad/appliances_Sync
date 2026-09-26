import { checkMasterConnection } from '../database/masterPool.js';

export const getHealth = async (req, res, next) => {
  try {
    const isMasterConnected = await checkMasterConnection();

    if (isMasterConnected) {
      res.status(200).json({
        status: 'success',
        message: 'Server and master database are healthy',
        timestamp: new Date().toISOString(),
        services: {
          masterDatabase: 'connected',
          server: 'running'
        }
      });
    } else {
      res.status(503).json({
        status: 'error',
        message: 'Master database connection failed',
        timestamp: new Date().toISOString(),
        services: {
          masterDatabase: 'disconnected',
          server: 'running'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
