import { handleAdminRequest } from '@/lib/adminHandlers';

type RouteContext = { params: { path: string[] } };

export async function GET(request: Request, { params }: RouteContext) {
  return handleAdminRequest(request, params.path, 'GET');
}

export async function POST(request: Request, { params }: RouteContext) {
  return handleAdminRequest(request, params.path, 'POST');
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleAdminRequest(request, params.path, 'PATCH');
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return handleAdminRequest(request, params.path, 'DELETE');
}
