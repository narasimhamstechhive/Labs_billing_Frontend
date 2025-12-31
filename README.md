# Labs Billing Frontend

## Vercel Deployment

This frontend is configured for Vercel deployment using Vite.

### Required Environment Variables

Set this in Vercel Dashboard → Settings → Environment Variables:

- `VITE_API_URL` - Your backend API URL (e.g., `https://your-backend.vercel.app/api`)

### Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel` (first time) or `vercel --prod` (production)
4. Set `VITE_API_URL` environment variable in Vercel dashboard
5. Redeploy after setting environment variable

### Build

The project builds automatically on Vercel. Build command: `npm run build`

### Notes

- Environment variables must start with `VITE_` to be accessible in the frontend
- The API URL is configured in `src/services/api.js`
- All routes are handled by React Router with client-side routing
