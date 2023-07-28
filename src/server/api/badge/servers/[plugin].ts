import {KVNamespace} from '@cloudflare/workers-types'
import {shieldResponse} from '~/server/utils/shields'
import {getPluginServers} from '~/server/utils/bstats'
import {formatMetric} from '~/server/utils/formatter'

const plugins: { [p: string]: number[] } = useRuntimeConfig().plugins

export default defineEventHandler(async ({context}) => {
    const plugin = context.params?.plugin
    if (plugin === undefined || !(plugin in plugins)) {
        return shieldResponse('servers', 'invalid', 'red', true)
    }

    let cacheKV: KVNamespace | undefined = undefined
    if ('cloudflare' in context) {
        cacheKV = context.cloudflare.env['METRICS']
    }

    let servers = 0

    const requests: Promise<number>[] = []
    for (const pluginID of plugins[plugin]) {
        requests.push(getPluginServers(pluginID, cacheKV).then(result => servers += result))
    }
    await Promise.allSettled(requests)

    return shieldResponse('servers', formatMetric(servers), 'blue')
})
