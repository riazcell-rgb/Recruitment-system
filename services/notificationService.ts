
import { JobAlertSubscription, JobAlertLog, JobTemplate } from '../types';

const ALERTS_STORAGE_KEY = 'hirestream_job_alerts';
const ALERTS_LOG_KEY = 'hirestream_job_alerts_log';

/**
 * Simulates sending an email to a candidate.
 * In a real-world scenario, this would call a backend API (SendGrid, AWS SES, etc.)
 */
export const sendEmailNotification = async (email: string, subject: string, body: string): Promise<boolean> => {
  console.log(`%c[Email Service] Sending to ${email}...`, 'color: #6366f1; font-weight: bold;');
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return true;
};

/**
 * Processes all active subscriptions against a new job template.
 * If a match is found, an email is sent and the event is logged.
 */
export const processJobAlerts = async (newJob: JobTemplate) => {
  const subscriptionsJson = localStorage.getItem(ALERTS_STORAGE_KEY);
  if (!subscriptionsJson) return;

  const subscriptions: JobAlertSubscription[] = JSON.parse(subscriptionsJson);
  const activeSubs = subscriptions.filter(s => s.active);

  const logsJson = localStorage.getItem(ALERTS_LOG_KEY);
  const logs: JobAlertLog[] = logsJson ? JSON.parse(logsJson) : [];

  for (const sub of activeSubs) {
    // Check if any keyword matches the title or description
    const match = sub.keywords.find(k => 
      newJob.title.toLowerCase().includes(k.toLowerCase()) || 
      newJob.description.toLowerCase().includes(k.toLowerCase())
    );

    if (match) {
      const subject = `New Job Opportunity: ${newJob.title}`;
      const body = `Hello ${sub.candidateName},\n\nA new position matching your keyword "${match}" has been posted: ${newJob.title}.\n\nDescription: ${newJob.description}\n\nLogin to your HireStream portal to apply.`;
      
      const sent = await sendEmailNotification(sub.candidateEmail, subject, body);
      
      if (sent) {
        const newLog: JobAlertLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          candidateEmail: sub.candidateEmail,
          jobTitle: newJob.title,
          matchKeyword: match,
          sentAt: new Date().toISOString()
        };
        logs.push(newLog);
      }
    }
  }

  localStorage.setItem(ALERTS_LOG_KEY, JSON.stringify(logs));
};
