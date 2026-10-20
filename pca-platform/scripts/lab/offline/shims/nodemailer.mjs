// harness-only: no mail is sent from DB-level checks
export function createTransport() { return { sendMail: async () => { throw new Error("mail disabled in harness"); }, verify: async () => false }; }
export default { createTransport };
