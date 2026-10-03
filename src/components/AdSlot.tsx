import {ArrowDownRight} from 'lucide-react';
export function AdSlot({placement,format='leaderboard'}:{placement:string;format?:'leaderboard'|'rectangle'|'skyscraper'}) {
 return <div className={`ad-slot ${format}`} data-placement={placement} aria-label="Reserved advertisement space"><span>ADVERTISEMENT</span></div>;
}
export function PromoTile(){return <div className="promo-tile"><strong>SMALL<br/>GAMES.<br/>BIG<br/>BREAKS.</strong><ArrowDownRight className="promo-arrow" size={100} strokeWidth={1.4}/><span>JUST PRESS PLAY</span><small>Original games, made for you.</small></div>}
