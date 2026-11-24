import sys, json, xlrd
src, out = sys.argv[1], sys.argv[2]
sh = xlrd.open_workbook(src, ignore_workbook_corruption=True).sheet_by_index(0)
def num(v):
    if isinstance(v, float): return v
    v = str(v).strip().replace(',', '.')
    if v in ('', '-'): return None
    if v.lower() == 'traces': return 0.0
    if v.startswith('<'): return 0.0
    try: return float(v)
    except: return None
def r1(x): return None if x is None else round(x, 1)
foods = []
groups = {}
for i in range(1, sh.nrows):
    row = sh.row_values(i)
    code = int(row[6]); name = str(row[7]).strip()
    grp = str(row[3]).strip() or 'divers'; sub = str(row[4]).strip()
    kcal = num(row[10]);
    if kcal is None: kcal = num(row[12])
    gi = groups.setdefault(grp, len(groups))
    foods.append([code, name, gi, None if kcal is None else round(kcal),
                  r1(num(row[14])), r1(num(row[16])), r1(num(row[17])),
                  r1(num(row[18])), r1(num(row[26])), r1(num(row[27])), r1(num(row[49]))])
data = {"source": "Anses. Table de composition nutritionnelle des aliments Ciqual 2020",
        "fields": ["code","nom","groupe","kcal","proteines","glucides","lipides","sucres","fibres","polyols","sel"],
        "groupes": list(groups.keys()), "aliments": foods}
json.dump(data, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(foods), 'aliments')
for f in foods:
    if any(k in f[1].lower() for k in ['steak haché, 5%', 'haricot vert, cuit', 'riz blanc, cuit', 'lentille verte, cuite', 'whey']): print(f)
