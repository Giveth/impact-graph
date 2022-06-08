import Axios from 'axios';
import { Project } from '../entities/project';

const sendEmailUrl = process.env.DAPP_MAILER_URL as string;
const dappMailerAuthKey = process.env.DAPP_MAILER_AUTHORIZATION_KEY as string;
const enableDappMailing = process.env.ENABLE_DAPP_MAILER as string;
const dappUrl = process.env.FRONTEND_URL as string;

// TODO: After creating the template, update values
export const sendEmail = async (
  email: string,
  project: Project,
  token: string,
) => {
  if (enableDappMailing === 'true') {
    await Axios.post(
      sendEmailUrl,
      {
        recipient: email,
        template: 'notification',
        subject: 'Giveth - Please confirm your email!',
        secretIntro: 'Take action! Please confirm your email!',
        title: 'Take action! Your email needs confirmation!',
        image: 'Giveth-donation-banner-email.png',
        text: '',
        cta: 'View Donations',
        ctaRelativeUrl: `/verification/${project.slug}/${token}`,
        unsubscribeType: 'donation-delegated',
        unsubscribeReason:
          'You receive this email because your email needs to be confirmed',
        dappUrl,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: dappMailerAuthKey,
        },
      },
    );
  }
};
