# **App Name**: Plamento Auth

## Core Features:

- Sign Up Page: Modern user registration page with inputs for personal information, email, phone, DoB, and password creation.
- Sign In Page: Streamlined login page with email and password inputs, forgot password link, and new user sign-up option.
- Dashboard Page: Simple dashboard welcome page with placeholders for content cards and user avatar dropdown.
- Forgot Password Flow: Multi-step 'Forgot Password' flow: Email entry, code verification, and password reset.
- Email Validation: Validate registered emails before sending reset code; display 'Email was not registered' error if needed.
- Phone Number Validation: Include a country code dropdown (+91 for India) and require a 10-digit phone number for Indian users.
- Secure Password Reset Workflow: Verify email registration before sending the code tool; provide secure 6-digit reset code with robust error handling and retries, without blocking valid users.

## Style Guidelines:

- Primary color: Deep indigo (#483D8B) to evoke feelings of security and trust.
- Background color: Deep charcoal (#222222) for a sophisticated dark theme.
- Accent color: Soft lavender (#D8CEE6) for highlights and interactive elements, adding contrast and sophistication.
- Body and headline font: 'Inter', a grotesque-style sans-serif.
- Minimalist line icons in soft lavender for key actions.
- Use clear spacing and rounded inputs.
- Subtle transition effects for page loading and form interactions.