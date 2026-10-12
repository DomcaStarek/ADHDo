import logging
from app.core.config import settings

logger = logging.getLogger("email_service")

class EmailService:
    @staticmethod
    async def send_verification_email(to_email: str, raw_token: str) -> None:
        """
        Sends an email verification link.
        In development, logs the link clearly to standard output.
        In production, integrate with aiosmtplib / SendGrid / SES.
        """
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
        
        email_body = f"""
============================================================
[ADHDo EMAIL DISPATCH]
To: {to_email}
Subject: Welcome to ADHDo - Verify your email & start cleaning!

Hi there,

Welcome to ADHDo! Click the link below to verify your account
and match with your first virtual body-doubling partner:

{verification_link}

Token: {raw_token}
(Link valid for {settings.EMAIL_VERIFY_TOKEN_EXPIRE_HOURS} hours)
============================================================
"""
        print(email_body)
        logger.info(f"Verification email dispatched to {to_email}: token={raw_token}")

email_service = EmailService()
