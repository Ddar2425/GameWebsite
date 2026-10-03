import {notFound} from 'next/navigation';
import {Catalog} from '@/components/Catalog';
import {categories} from '@/data/categories';
export function generateStaticParams(){return categories.map(c=>({slug:c.toLowerCase()}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const c=categories.find(c=>c.toLowerCase()===slug);return {title:c?`${c} games`:'Category not found',description:`Explore original ${c||''} browser games on Sproutplay.`}}
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const c=categories.find(c=>c.toLowerCase()===slug);if(!c)notFound();return <Catalog mode="category" category={slug} title={`${c.toUpperCase()} GAMES`}/>}
