import itertools, random
# valid length-9 sequences: each of 0,1,2 three times, no cyclic adjacent repeat, max cyclic gap <=4
def ok(s):
    if any(s[i]==s[(i+1)%9] for i in range(9)): return False
    for v in range(3):
        pos=[i for i in range(9) if s[i]==v]
        gaps=[(pos[(j+1)%3]-pos[j])%9 for j in range(3)]
        if max(gaps)>5: return False
    weeks=[tuple(s[i:i+3]) for i in (0,3,6)]
    return len(set(weeks))==3
seqs=sorted({p for p in itertools.permutations([0,0,0,1,1,1,2,2,2]) if p[0]==0 and ok(p)})
print(len(seqs),'valid base seqs')
random.seed(7)
best=None
slots=['A','B','C','D','E','Fb','Ft']
for _ in range(300000):
    pick=[random.choice(seqs) for _ in slots]
    # relabel per slot so different slots start on different items
    perm=[random.choice(list(itertools.permutations(range(3)))) for _ in slots]
    S=[tuple(perm[k][pick[k][s]] for k in range(len(slots))) for s in range(9)]
    if len(set(S))<9: continue
    # avoid dip(Ft=2) same session as machine chest(D=2): penalty count; and max overlap between consecutive sessions
    pen=sum(1 for s in S if s[6]==2 and s[3]==2)
    overlap=max(sum(a==b for a,b in zip(S[i],S[(i+1)%9])) for i in range(9))
    pair=max(sum(a==b for a,b in zip(S[i],S[j])) for i in range(9) for j in range(i+1,9))
    tot=sum(sum(a==b for a,b in zip(S[i],S[j])) for i in range(9) for j in range(i+1,9))
    score=(pen,overlap,pair,tot)
    if best is None or score<best[0]: best=(score,S,pick,perm)
print(best[0])
for s in best[1]: print(s)
