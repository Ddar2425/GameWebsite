import type {MetadataRoute} from 'next';
import {games} from '@/data/games';
import {categories} from '@/data/categories';
export default function sitemap():MetadataRoute.Sitemap {const base=process.env.SITE_URL||'https://sproutplay.example';return ['/','/games','/search','/favorites','/recent','/about',...games.map(g=>`/games/${g.slug}`),...categories.map(c=>`/category/${c.toLowerCase()}`)].map(path=>({url:`${base}${path}`,changeFrequency:'weekly',priority:path==='/'?1:0.7}))}
