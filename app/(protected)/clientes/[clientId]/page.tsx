import { redirect } from "next/navigation";

export default async function ClientRootPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/clientes/${clientId}/consolidado`);
}
