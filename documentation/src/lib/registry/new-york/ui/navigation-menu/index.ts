import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui'

import Content from './navigation-menu-content.svelte'
import Separator from './navigation-menu-indicator.svelte'
import Indicator from './navigation-menu-indicator.svelte'
import Item from './navigation-menu-item.svelte'
import Link from './navigation-menu-link.svelte'
import Trigger from './navigation-menu-trigger.svelte'
import Viewport from './navigation-menu-viewport.svelte'

const Root = NavigationMenuPrimitive.Root
const List = NavigationMenuPrimitive.List

export {
  Content,
  Indicator,
  Item,
  Link,
  List,
  Content as NavigationMenuContent,
  Indicator as NavigationMenuIndicator,
  Item as NavigationMenuItem,
  Link as NavigationMenuLink,
  List as NavigationMenuList,
  //
  Root as NavigationMenuRoot,
  Separator as NavigationMenuSeparator,
  Trigger as NavigationMenuTrigger,
  Viewport as NavigationMenuViewport,
  Root,
  Separator,
  Trigger,
  Viewport,
}
