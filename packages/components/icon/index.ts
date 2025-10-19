import { withInstall } from '@axis-ui/utils/with-install'
import Icon from './src/icon.vue'


const axisIcon = withInstall(Icon as typeof Icon & { name: string })

export default axisIcon
