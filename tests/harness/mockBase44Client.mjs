let currentClient = null;

export function setMockBase44Client(client) {
  currentClient = client;
}

export async function getBase44Client() {
  if (!currentClient) throw new Error("MOCK_BASE44_CLIENT_NOT_SET");
  return currentClient;
}
