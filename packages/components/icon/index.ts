import { withInstall } from '@axis-ui/utils/with-install'
import Icon from './src/icon.vue'

const AxIcon = withInstall(Icon as typeof Icon & { name: string })

export default AxIcon
