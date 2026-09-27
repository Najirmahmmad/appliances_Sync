import { loginUser, refreshAccessToken } from '../services/authService.js';
import { AppError } from '../utils/errors.js';

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    res.json({
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const result = await refreshAccessToken(req.body.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

import { requestPasswordReset, resetPassword as resetPasswordService } from '../services/authService.js';

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await requestPasswordReset(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await resetPasswordService(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
