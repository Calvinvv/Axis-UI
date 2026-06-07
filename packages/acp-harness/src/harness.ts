import { ProcessManager } from './process-manager.js'
import { AcpSdkClient } from './sdk-client.js'
import { TargetRegistry } from './target-registry.js'
import type {
  HarnessInitialization,
  TargetHandle,
  TargetStartRequest,
} from './types.js'

export class AcpHarness {
  constructor(
    readonly registry: TargetRegistry,
    readonly processes = new ProcessManager(),
    private readonly sdk = new AcpSdkClient()
  ) {}

  async startTarget(request: TargetStartRequest): Promise<TargetHandle> {
    const resolved = await this.registry.resolve(request)
    const target = this.processes.start(resolved)
    this.sdk.connect(target)
    return target
  }

  async initialize(targetHandleId: string): Promise<HarnessInitialization> {
    return {
      targetHandleId,
      response: await this.sdk.initialize(targetHandleId),
    }
  }

  async stopTarget(targetHandleId: string): Promise<void> {
    await this.processes.stop(targetHandleId)
    this.sdk.close(targetHandleId)
  }

  async dispose(): Promise<void> {
    for (const target of this.processes.list()) this.sdk.close(target.id)
    await this.processes.stopAll()
  }
}
