import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sampleData = {
  guestName: "Jane Doe",
  guestEmail: "jane@example.com",
  eventTitle: "Tuesday Night Open Mic",
  eventDate: "Tuesday, March 10, 2026",
  eventTime: "7:00 PM - 10:00 PM",
  venueName: "The Laughing Duck",
  venueAddress: "123 Comedy Lane, Brooklyn, NY",
  sectionLabel: "Open Mic",
  slotPosition: 3,
  producerName: "Mike Producer",
  producerMessage: "<p>Please arrive <strong>15 minutes early</strong> for sound check.</p><ul><li>No covers</li><li>Keep sets under 5 minutes</li></ul>",
  cancelUrl: "#",
  eventPageUrl: "#",
  dashboardUrl: "#",
  periodLabel: "Monday, March 9, 2026",
};

// ─── CURRENT TEMPLATES (exact copies from edge functions) ───

const currentGuestConfirmation = `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
      <h1 style="color: #1a1a1a; margin-top: 0;">Booking Confirmed!</h1>
      <p>Hi ${sampleData.guestName},</p>
      <p>Your booking for <strong>${sampleData.eventTitle}</strong> has been confirmed!</p>
      <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Event Details</h2>
        <p style="margin: 8px 0;"><strong>Event:</strong> ${sampleData.eventTitle}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${sampleData.eventDate}</p>
        <p style="margin: 8px 0;"><strong>Time:</strong> ${sampleData.eventTime}</p>
        <p style="margin: 8px 0;"><strong>Venue:</strong> ${sampleData.venueName}, ${sampleData.venueAddress}</p>
        <p style="margin: 8px 0;"><strong>Section:</strong> ${sampleData.sectionLabel}</p>
        <p style="margin: 8px 0;"><strong>Your Slot:</strong> #${sampleData.slotPosition}</p>
      </div>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
        <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
      </div>
      <p style="margin-top: 30px;">We look forward to seeing you there!</p>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Go to Event Page</a>
      </div>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Cancel Your Booking</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions or need to make changes, please contact the event producer.</p>
    </div>
  </body>
</html>`;

const currentGuestCancellation = `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
      <h1 style="color: #1a1a1a; margin-top: 0;">Booking Canceled</h1>
      <p>Hi ${sampleData.guestName},</p>
      <p>Your booking for <strong>${sampleData.eventTitle}</strong>, slot #${sampleData.slotPosition}, has been successfully canceled.</p>
      <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Event Details</h2>
        <p style="margin: 8px 0;"><strong>Event:</strong> ${sampleData.eventTitle}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${sampleData.eventDate}</p>
        <p style="margin: 8px 0;"><strong>Time:</strong> ${sampleData.eventTime}</p>
        <p style="margin: 8px 0;"><strong>Venue:</strong> ${sampleData.venueName}, ${sampleData.venueAddress}</p>
        <p style="margin: 8px 0;"><strong>Section:</strong> ${sampleData.sectionLabel}</p>
        <p style="margin: 8px 0;"><strong>Your Slot:</strong> #${sampleData.slotPosition}</p>
      </div>
      <p style="margin-top: 30px;">We look forward to seeing you there!</p>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Go to Event Page</a>
      </div>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Cancel Your Booking</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions or need to make changes, please contact the event producer.</p>
    </div>
  </body>
</html>`;

const currentGuestManualAdd = `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
      <h1 style="color: #1a1a1a; margin-top: 0;">You've been added to a slot!</h1>
      <p>Hi ${sampleData.guestName},</p>
      <p>You've been added to <strong>${sampleData.eventTitle}</strong> by the producer.</p>
      <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Event Details</h2>
        <p style="margin: 8px 0;"><strong>Event:</strong> ${sampleData.eventTitle}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${sampleData.eventDate}</p>
        <p style="margin: 8px 0;"><strong>Time:</strong> ${sampleData.eventTime}</p>
        <p style="margin: 8px 0;"><strong>Venue:</strong> ${sampleData.venueName}, ${sampleData.venueAddress}</p>
        <p style="margin: 8px 0;"><strong>Section:</strong> ${sampleData.sectionLabel}</p>
        <p style="margin: 8px 0;"><strong>Your Slot:</strong> #${sampleData.slotPosition}</p>
      </div>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
        <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
      </div>
      <p style="margin-top: 30px;">We look forward to seeing you there!</p>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Go to Event Page</a>
      </div>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Cancel Your Booking</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions or need to make changes, please contact the event producer.</p>
    </div>
  </body>
</html>`;

const currentProducerBooking = `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
      <h1 style="color: #1a1a1a; margin-top: 0;">New Booking Made!</h1>
      <p>Hi ${sampleData.producerName},</p>
      <p><strong>${sampleData.guestName}</strong> (${sampleData.guestEmail}) has signed up for your event <strong>${sampleData.eventTitle}</strong>!</p>
      <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Event & Booking Details</h2>
        <p style="margin: 8px 0;"><strong>Event Name:</strong> ${sampleData.eventTitle}</p>
        <p style="margin: 8px 0;"><strong>Event Date:</strong> ${sampleData.eventDate}</p>
        <p style="margin: 8px 0;"><strong>Event Time:</strong> ${sampleData.eventTime}</p>
        <p style="margin: 8px 0;"><strong>Venue:</strong> ${sampleData.venueName}, ${sampleData.venueAddress}</p>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p style="margin: 8px 0; font-weight: 600; color: #28a745;">Sign Up User Information:</p>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${sampleData.guestName}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${sampleData.guestEmail}</p>
          <p style="margin: 8px 0;"><strong>Section:</strong> ${sampleData.sectionLabel}</p>
          <p style="margin: 8px 0;"><strong>Slot Number:</strong> #${sampleData.slotPosition}</p>
        </div>
      </div>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
        <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
      </div>
      <p style="margin-top: 30px;">You can manage all bookings and event details from your dashboard:</p>
      <a href="#" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Go to Dashboard</a>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">This is an automated notification. Please do not reply directly to this email.</p>
    </div>
  </body>
</html>`;

const currentMicGoesLive = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🎤 Your Mic is Live!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${sampleData.producerName},</p>
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Great news! Your mic <strong>"${sampleData.eventTitle}"</strong> is now live and accepting sign-ups.</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${sampleData.eventTitle}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${sampleData.eventDate} at ${sampleData.eventTime}</span></td></tr>
                      <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${sampleData.venueName}, ${sampleData.venueAddress}</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
              </div>
              <p style="margin: 20px 0 0 0; color: #111827; font-size: 16px; line-height: 1.6;">People can now sign up for your mic. You'll receive notifications about new sign-ups based on your email frequency settings.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">&copy; 2026 QuackBoard. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const currentProducerNotifications = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Daily Activity Report</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">${sampleData.periodLabel}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${sampleData.eventTitle}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${sampleData.eventDate} at ${sampleData.eventTime}</span></td></tr>
                      <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${sampleData.venueName}, ${sampleData.venueAddress}</span></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #f3f4f6;">
                          <th style="padding: 16px 20px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Slot</th>
                          <th style="padding: 16px 20px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Guest Name</th>
                          <th style="padding: 16px 20px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style="background-color: #ffffff;">
                          <td style="padding: 18px 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937;">
                            <span style="display: inline-block; background-color: #EEF2FF; color: #4F46E5; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">${sampleData.sectionLabel} - Slot ${sampleData.slotPosition}</span>
                          </td>
                          <td style="padding: 18px 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;">${sampleData.guestName}</td>
                          <td style="padding: 18px 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;">${sampleData.guestEmail}</td>
                        </tr>
                        <tr style="background-color: #fafbfc;">
                          <td style="padding: 18px 20px; font-size: 14px; color: #1f2937;">
                            <span style="display: inline-block; background-color: #EEF2FF; color: #4F46E5; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">${sampleData.sectionLabel} - Slot 4</span>
                          </td>
                          <td style="padding: 18px 20px; font-size: 14px; color: #4b5563;">John Smith</td>
                          <td style="padding: 18px 20px; font-size: 14px; color: #4b5563;">john@example.com</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">&copy; 2026 QuackBoard. All rights reserved.</p>
              <p style="margin: 0;"><a href="#" style="color: #4F46E5; text-decoration: none; font-size: 13px; font-weight: 500;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── PROPOSED TEMPLATES ───

const proposedGuestConfirmation = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">✅ Booking Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${sampleData.guestName},</p>
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Your booking for <strong>"${sampleData.eventTitle}"</strong> has been confirmed!</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${sampleData.eventTitle}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${sampleData.eventDate} at ${sampleData.eventTime}</span></td></tr>
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${sampleData.venueName}, ${sampleData.venueAddress}</span></td></tr>
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">🎯</span><span><strong>${sampleData.sectionLabel}</strong> · Spot #${sampleData.slotPosition}</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
              </div>
              <p style="margin: 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">We look forward to seeing you there!</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="#" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Event Page</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="#" style="display: inline-block; border: 2px solid #e5e7eb; color: #6b7280; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">Cancel Your Booking</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">&copy; 2026 QuackBoard. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const proposedGuestCancellation = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Booking Canceled</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${sampleData.guestName},</p>
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Your booking for <strong>"${sampleData.eventTitle}"</strong> (${sampleData.sectionLabel}) has been successfully canceled.</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${sampleData.eventTitle}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${sampleData.eventDate} at ${sampleData.eventTime}</span></td></tr>
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${sampleData.venueName}, ${sampleData.venueAddress}</span></td></tr>
                      <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">🎯</span><span><strong>${sampleData.sectionLabel}</strong> · Spot #${sampleData.slotPosition}</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">If you have any questions, please contact the event producer.</p>
              <!-- NOTE: Cancel button intentionally removed for cancellation emails -->
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">&copy; 2026 QuackBoard. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const proposedGuestManualAdd = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🎤 You've Been Added!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${sampleData.guestName},</p>
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">You've been added to <strong>"${sampleData.eventTitle}"</strong> by the producer.</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${sampleData.eventTitle}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${sampleData.eventDate} at ${sampleData.eventTime}</span></td></tr>
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${sampleData.venueName}, ${sampleData.venueAddress}</span></td></tr>
                      <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">🎯</span><span><strong>${sampleData.sectionLabel}</strong> · Spot #${sampleData.slotPosition}</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
              </div>
              <p style="margin: 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">We look forward to seeing you there!</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="#" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Event Page</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="#" style="display: inline-block; border: 2px solid #e5e7eb; color: #6b7280; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">Cancel Your Booking</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">&copy; 2026 QuackBoard. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const proposedProducerBooking = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>ul, ol { padding-left: 25px; margin: 10px 0; } li { margin-bottom: 5px; }</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #34a08c 0%, #298070 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🎉 New Booking!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${sampleData.producerName},</p>
              <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;"><strong>${sampleData.guestName}</strong> (${sampleData.guestEmail}) has signed up for your event <strong>"${sampleData.eventTitle}"</strong>!</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">${sampleData.eventTitle}</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📅</span><span>${sampleData.eventDate} at ${sampleData.eventTime}</span></td></tr>
                      <tr><td style="color: #6b7280; font-size: 14px; line-height: 1.6;"><span style="display: inline-block; margin-right: 6px;">📍</span><span>${sampleData.venueName}, ${sampleData.venueAddress}</span></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px; border-top: 2px solid #e5e7eb;">
                    <p style="margin: 0 0 12px 0; font-weight: 600; color: #34a08c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Sign Up Details</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Name:</strong> ${sampleData.guestName}</td></tr>
                      <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Email:</strong> ${sampleData.guestEmail}</td></tr>
                      <tr><td style="padding-bottom: 8px; color: #4b5563; font-size: 14px;"><strong>Section:</strong> ${sampleData.sectionLabel}</td></tr>
                      <tr><td style="color: #4b5563; font-size: 14px;"><strong>Spot:</strong> #${sampleData.slotPosition}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Instruction from the Producer</p>
                <div style="margin: 0; color: #000000; font-size: 15px; line-height: 1.5;">${sampleData.producerMessage}</div>
              </div>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0 10px;">
                    <a href="#" style="display: inline-block; background-color: #34a08c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">QuackBoard</p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">&copy; 2026 QuackBoard. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const proposedMicGoesLive = currentMicGoesLive
  .replace(/linear-gradient\(135deg, #4F46E5 0%, #7C3AED 100%\)/g, 'linear-gradient(135deg, #34a08c 0%, #298070 100%)');

const proposedProducerNotifications = currentProducerNotifications
  .replace(/linear-gradient\(135deg, #4F46E5 0%, #7C3AED 100%\)/g, 'linear-gradient(135deg, #34a08c 0%, #298070 100%)')
  .replace(/background-color: #EEF2FF; color: #4F46E5/g, 'background-color: #e6f5f2; color: #2a7d6b')
  .replace(/color: #4F46E5; text-decoration: none; font-size: 13px/g, 'color: #34a08c; text-decoration: none; font-size: 13px');

// ─── TEMPLATE CONFIG ───

const templates = [
  { id: "guest-confirm", label: "Guest Confirmation", current: currentGuestConfirmation, proposed: proposedGuestConfirmation },
  { id: "guest-cancel", label: "Guest Cancellation", current: currentGuestCancellation, proposed: proposedGuestCancellation },
  { id: "guest-manual", label: "Guest Manual Add", current: currentGuestManualAdd, proposed: proposedGuestManualAdd },
  { id: "producer-booking", label: "Producer Booking", current: currentProducerBooking, proposed: proposedProducerBooking },
  { id: "mic-live", label: "Mic Goes Live", current: currentMicGoesLive, proposed: proposedMicGoesLive },
  { id: "producer-report", label: "Activity Report", current: currentProducerNotifications, proposed: proposedProducerNotifications },
];

function EmailIframe({ html, title }: { html: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <iframe
        srcDoc={html}
        title={title}
        className="w-full border border-border rounded-lg"
        style={{ height: 800, background: "#f5f5f5" }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

export default function EmailPreview() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Email Template Preview</h1>
        <p className="text-muted-foreground mb-6 text-sm">Compare current vs proposed email designs side-by-side. No edge function code has been modified.</p>

        <Tabs defaultValue="guest-confirm">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            {templates.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {templates.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EmailIframe html={t.current} title="Current" />
                <EmailIframe html={t.proposed} title="Proposed" />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
