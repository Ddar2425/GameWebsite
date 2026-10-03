import {Catalog} from '@/components/Catalog';
export const metadata={title:'Search games'};
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string|string[];category?:string|string[]}>}){const raw=await searchParams;const q=(Array.isArray(raw.q)?raw.q[0]:raw.q)||'';const category=Array.isArray(raw.category)?raw.category[0]:raw.category;return <Catalog key={`${q}:${category}`} mode="search" title="Search games" query={q} category={category}/>}
