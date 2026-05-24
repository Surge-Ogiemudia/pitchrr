import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    persona: 'startup' | 'career';
  }

  interface Session {
    user: User & {
      id: string;
      persona: 'startup' | 'career';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    persona: 'startup' | 'career';
  }
}
