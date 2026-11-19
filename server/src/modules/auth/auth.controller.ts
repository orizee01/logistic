import { Request, Response } from 'express';
import { env } from '../../config/env';
import { isEmailDeliveryEnabled } from '../../utils/mailer';
import { AccountType } from './auth.repository';
import { authService } from './auth.service';

function login(type: AccountType) {
  return async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const context = { at: new Date(), ip: req.ip ?? null, userAgent: req.get('user-agent') ?? null };
    res.json(await authService.login(type, email, password, context));
  };
}

export const authController = {
  customerLogin: login('customer'),
  riderLogin: login('rider'),
  staffLogin: login('staff'),

  async requestActivation(req: Request, res: Response): Promise<void> {
    const link = await authService.requestActivation(req.body.accountType, req.body.email);
    res.status(202).json({
      message: 'If an account exists for that email, an activation link has been sent.',
      // Only when emails are printed to the console instead of sent; once real email works,
      // the link goes only to the account's inbox.
      ...(env.showDevActivationLinks && !isEmailDeliveryEnabled() ? { devActivationLink: link } : {}),
    });
  },

  async completeActivation(req: Request, res: Response): Promise<void> {
    const accountType = await authService.completeActivation(req.body.token, req.body.password);
    res.json({ message: 'Your password has been set. You can now log in.', accountType });
  },
};
