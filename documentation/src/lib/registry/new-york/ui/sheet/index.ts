import { Dialog as SheetPrimitive } from 'bits-ui'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '$lib/utils/cn'

import Content from './sheet-content.svelte'
import Description from './sheet-description.svelte'
import Footer from './sheet-footer.svelte'
import Header from './sheet-header.svelte'
import Overlay from './sheet-overlay.svelte'
import Title from './sheet-title.svelte'

const Root = SheetPrimitive.Root
const Close = SheetPrimitive.Close
const Trigger = SheetPrimitive.Trigger
const Portal = SheetPrimitive.Portal

export {
  Close,
  Content,
  Description,
  Footer,
  Header,
  Overlay,
  Portal,
  Root,
  //
  Root as Sheet,
  Close as SheetClose,
  Content as SheetContent,
  Description as SheetDescription,
  Footer as SheetFooter,
  Header as SheetHeader,
  Overlay as SheetOverlay,
  Portal as SheetPortal,
  Title as SheetTitle,
  Trigger as SheetTrigger,
  Title,
  Trigger,
}

export const sheetVariants = tv({
  base: cn(
    'bg-base-100',
    'fixed z-50 gap-4 p-6 shadow-lg transition ease-in-out',

    'data-[state=open]:animate-in',
    'data-[state=closed]:animate-out',
    'data-[state=closed]:duration-300',
    'data-[state=open]:duration-500',
  ),
  variants: {
    side: {
      top: cn(
        'data-[state=closed]:slide-out-to-top',
        'data-[state=open]:slide-in-from-top',
        'inset-x-0 top-0 border-b',
      ),
      bottom: cn(
        'data-[state=closed]:slide-out-to-bottom',
        'data-[state=open]:slide-in-from-bottom',
        'inset-x-0 bottom-0 border-t',
      ),
      left: cn(
        'data-[state=closed]:slide-out-to-left',
        'data-[state=open]:slide-in-from-left',
        'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
      ),
      right: cn(
        'data-[state=closed]:slide-out-to-right',
        'data-[state=open]:slide-in-from-right',
        'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
      ),
    },
  },
  defaultVariants: {
    side: 'right',
  },
})

export type Side = VariantProps<typeof sheetVariants>['side']
