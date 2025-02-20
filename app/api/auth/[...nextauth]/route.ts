import NextAuth from "next-auth";
import { authOptions } from '@/app/config/auth.config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 