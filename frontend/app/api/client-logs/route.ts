// Dev-only browser log intake route.
// Avoid exporting runtime/dynamic so static export won't fail.
import { POST as routePOST } from '@browser-echo/next/route';
export const POST = routePOST;
