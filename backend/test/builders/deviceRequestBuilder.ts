export class DeviceRequestBuilder {
  private params: Record<string, string> = {};
  private body: Record<string, unknown> = {};
  private user: { id: number } | null = null;

  withDeviceId(deviceId: string): this {
    this.params.id = deviceId;
    return this;
  }

  withNumericId(id: string): this {
    this.params.id = id;
    return this;
  }

  withBody(body: Record<string, unknown>): this {
    this.body = body;
    return this;
  }

  withUserId(userId: number): this {
    this.user = { id: userId };
    return this;
  }

  build() {
    return {
      params: { ...this.params },
      body: { ...this.body },
      user: this.user ? { ...this.user } : null,
    };
  }
}
