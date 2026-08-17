import 'server-only'
import type { TransactionalEmailMessage } from './templates'

export async function sendTransactionalEmail(input:{to:string;message:TransactionalEmailMessage;required?:boolean}){const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;const required=input.required!==false;if(!key||!from){if(required)throw new Error('EMAIL_CONFIG_MISSING');return false}const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({from,to:[input.to.trim().toLowerCase()],subject:input.message.subject,text:input.message.text})});if(!response.ok){if(required)throw new Error(`EMAIL_SEND_FAILED:${response.status}`);return false}return true}
