export const cors = {
  origin: `${process.env.WEB_URL}`,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
  credentials: true,
}
