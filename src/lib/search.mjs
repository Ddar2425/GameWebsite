export const normalize = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
export function searchGames(games, query) {
 const terms=query.trim().split(/\s+/).filter(Boolean).map(normalize);
 const combined=normalize(query);
 return games.filter(game=> {
 const fields=[game.title,...(game.alternateTitles||[]),game.category,...game.tags,game.description].map(normalize);
 return !combined || fields.some(field=>field.includes(combined)) || terms.every(term=>fields.some(field=>field.includes(term)));
 });
}
export function relatedGames(games, current, limit=16) {
 return games.filter(g=>g.id!==current.id).map(game=>({game,score:(game.category===current.category?5:0)+game.tags.filter(tag=>current.tags.includes(tag)).length*2+(game.popular?1:0)})).sort((a,b)=>b.score-a.score||b.game.playCount-a.game.playCount).slice(0,limit).map(x=>x.game);
}
