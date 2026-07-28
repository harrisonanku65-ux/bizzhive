declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
    // Admin sessions are tracked under a separate key from userId so a
    // buyer/seller session can never be mistaken for an admin one.
    adminId: number;
    adminEmail: string;
  }
}

export {};
