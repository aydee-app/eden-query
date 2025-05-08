// Components generated, handled etc. by remark need to be camelcase
// to distinguish them from custom components that are globally available in markdown files.
// This is because they are internally converted to scoped components.
// e.g. <p></p> --> <MDSX.p></MDSX.p>

export { default as a } from './a.svelte'
export { default as blockquote } from './blockquote.svelte'
export { default as code } from './code.svelte'
export { default as details } from './details.svelte'
export { default as gitHubAlert } from './github-alert.svelte'
export { default as h1 } from './h1.svelte'
export { default as h2 } from './h2.svelte'
export { default as h3 } from './h3.svelte'
export { default as h4 } from './h4.svelte'
export { default as h5 } from './h5.svelte'
export { default as h6 } from './h6.svelte'
export { default as hr } from './hr.svelte'
export { default as img } from './img.svelte'
export { default as li } from './li.svelte'
export { default as ol } from './ol.svelte'
export { default as p } from './p.svelte'
export { default as pre } from './pre.svelte'
export { default as table } from './table.svelte'
export { default as tabs } from './tabs.svelte'
export { default as tabsContent } from './tabs-content.svelte'
export { default as tabsList } from './tabs-list.svelte'
export { default as tabsTrigger } from './tabs-trigger.svelte'
export { default as td } from './td.svelte'
export { default as th } from './th.svelte'
export { default as tr } from './tr.svelte'
export { default as ul } from './ul.svelte'

// Custom components that can be used in Markdown files without explicit imports.
//
// export { default as Callout } from '$lib/components/docs/callout.svelte'
// export { default as ComponentPreview } from '$lib/components/docs/component-preview.svelte'
// export { default as ComponentPreviewManual } from '$lib/components/docs/component-preview-manual.svelte'
// export { default as DocsFigure } from '$lib/components/docs/docs-figure.svelte'
// export { default as InstallTabs } from '$lib/components/docs/install-tabs.svelte'
// export { default as LinkedCard } from '$lib/components/docs/linked-card.svelte'
// export { default as Image } from '$lib/components/image.svelte'
// export { default as Link } from '$lib/components/link.svelte'
// export { default as Step } from '$lib/components/step.svelte'
// export { default as Steps } from '$lib/components/steps.svelte'

// Registry components that can be used in Markdown files without explicit imports.
//
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '$lib/registry/new-york/ui/accordion'
export { Button } from '$lib/registry/new-york/ui/button'
export { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/registry/new-york/ui/tabs'
