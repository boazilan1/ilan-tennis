function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

async function sendEmail(apiKey, message) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Email service not configured' })
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || 'אילן טניס <onboarding@resend.dev>'
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'ilantennisacademy@gmail.com'

  const { type, registrantEmail, registrantName, playerName, activityName, activityDay, activityTime, price } = req.body || {}

  if (!type || !registrantEmail || !playerName || !activityName) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const scheduleLine = [activityDay, activityTime].filter(Boolean).join(' · ')
  const messages = []

  if (type === 'new_registration') {
    messages.push({
      from,
      to: registrantEmail,
      subject: `קיבלנו את ההרשמה שלך ל${activityName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #222;">
          <h2 style="color: #1a472a;">קיבלנו את ההרשמה שלך! 🎾</h2>
          <p>ההרשמה של <strong>${escapeHtml(playerName)}</strong> לחוג <strong>${escapeHtml(activityName)}</strong>${scheduleLine ? ` (${escapeHtml(scheduleLine)})` : ''} התקבלה בהצלחה.</p>
          <p>ההרשמה תאושר סופית לאחר אישור התשלום. אם עדיין לא השלמת את התשלום, יש לעשות זאת בהקדם.</p>
          <p>בברכה,<br/>אילן טניס</p>
        </div>
      `,
    })
    messages.push({
      from,
      to: adminEmail,
      subject: `הרשמה חדשה: ${playerName} - ${activityName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #222;">
          <h2 style="color: #1a472a;">הרשמה חדשה</h2>
          <p><strong>שחקן/ית:</strong> ${escapeHtml(playerName)}</p>
          <p><strong>חוג:</strong> ${escapeHtml(activityName)}${scheduleLine ? ` (${escapeHtml(scheduleLine)})` : ''}</p>
          ${price ? `<p><strong>מחיר:</strong> ₪${escapeHtml(String(price))}</p>` : ''}
          <p><strong>נרשם/ה על ידי:</strong> ${escapeHtml(registrantName || '—')} (${escapeHtml(registrantEmail)})</p>
          <p style="color:#d97706;"><strong>סטטוס:</strong> ממתין לאישור תשלום</p>
        </div>
      `,
    })
  } else if (type === 'payment_confirmed') {
    messages.push({
      from,
      to: registrantEmail,
      subject: `התשלום אושר - ${activityName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #222;">
          <h2 style="color: #1a472a;">התשלום אושר! ✓</h2>
          <p>ההרשמה של <strong>${escapeHtml(playerName)}</strong> לחוג <strong>${escapeHtml(activityName)}</strong> אושרה סופית.</p>
          <p>מחכים לראותכם על המגרש!</p>
          <p>בברכה,<br/>אילן טניס</p>
        </div>
      `,
    })
  } else {
    res.status(400).json({ error: 'Unknown type' })
    return
  }

  const results = await Promise.allSettled(messages.map(msg => sendEmail(apiKey, msg)))
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`notify email error (to: ${messages[i].to})`, result.reason)
    }
  })

  if (results.every(r => r.status === 'rejected')) {
    res.status(502).json({ error: 'Failed to send email' })
    return
  }

  res.status(200).json({ ok: true, failed: results.filter(r => r.status === 'rejected').length })
}
