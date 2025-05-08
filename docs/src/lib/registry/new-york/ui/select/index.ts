import { Select as SelectPrimitive } from 'bits-ui'

import Content from './select-content.svelte'
import GroupHeading from './select-group-heading.svelte'
import Item from './select-item.svelte'
import ScrollDownButton from './select-scroll-down-button.svelte'
import ScrollUpButton from './select-scroll-up-button.svelte'
import Separator from './select-separator.svelte'
import Trigger from './select-trigger.svelte'

const Root = SelectPrimitive.Root
const Group = SelectPrimitive.Group
const Portal = SelectPrimitive.Portal
const Viewport = SelectPrimitive.Viewport

export {
  Content,
  Group,
  GroupHeading,
  Item,
  Portal,
  Root,
  ScrollDownButton,
  ScrollUpButton,
  //
  Root as Select,
  Content as SelectContent,
  Group as SelectGroup,
  GroupHeading as SelectGroupHeading,
  Item as SelectItem,
  Portal as SelectPortal,
  ScrollDownButton as SelectScrollDownButton,
  ScrollUpButton as SelectScrollUpButton,
  Separator as SelectSeparator,
  Trigger as SelectTrigger,
  Viewport as SelectViewport,
  Separator,
  Trigger,
  Viewport,
}
