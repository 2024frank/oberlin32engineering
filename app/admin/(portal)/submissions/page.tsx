import { SubmissionInbox } from '@/components/admin/submissions/SubmissionInbox'
import { listSubmissions } from '@/lib/cms/submissions'
export default async function SubmissionsPage(){return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Inbox</p><h1>Public Submissions</h1><p>Review interest, project ideas, leadership interest, volunteers, and partnership inquiries.</p></div></div><SubmissionInbox initialRows={await listSubmissions()}/></main>}
