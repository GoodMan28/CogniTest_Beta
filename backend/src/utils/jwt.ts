if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required — refusing to start with an insecure default.');
}

export const JWT_SECRET: string = process.env.JWT_SECRET;
