import type { ClientCapabilities } from '@agentclientprotocol/sdk'

export type ClientProfileId = 'minimal' | 'permission-only'

export interface ClientCapabilityProfile {
  readonly id: ClientProfileId
  readonly capabilities: ClientCapabilities
  readonly allowedClientMethods: readonly string[]
}

export const clientProfiles: Readonly<
  Record<ClientProfileId, ClientCapabilityProfile>
> = Object.freeze({
  minimal: Object.freeze({
    id: 'minimal',
    capabilities: Object.freeze({}),
    allowedClientMethods: Object.freeze(['session/update']),
  }),
  'permission-only': Object.freeze({
    id: 'permission-only',
    capabilities: Object.freeze({}),
    allowedClientMethods: Object.freeze([
      'session/update',
      'session/request_permission',
    ]),
  }),
})
