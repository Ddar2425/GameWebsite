'use client';
import dynamic from 'next/dynamic';
import type {Game} from '@/types/game';
const GamePlayer=dynamic(()=>import('./GamePlayer').then(m=>m.GamePlayer),{ssr:false,loading:()=> <div className="player-placeholder skeleton" aria-label="Loading player"/>});
export function PlayerLoader({game}:{game:Game}){return <GamePlayer game={game}/>}
