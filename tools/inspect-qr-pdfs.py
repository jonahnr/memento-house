from pypdf import PdfReader
from pypdf.generic import ContentStream
from pathlib import Path
import math,json

def multiply(a,b):
 return [a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]]
def images(stream,resources,reader,ctm=None):
 ctm=ctm or [1,0,0,1,0,0];stack=[];found=[]
 for args,op in ContentStream(stream,reader).operations:
  if op==b'q':stack.append(ctm[:])
  elif op==b'Q':ctm=stack.pop()
  elif op==b'cm':ctm=multiply([float(x) for x in args],ctm)
  elif op==b'Do':
   obj=resources['/XObject'][args[0]].get_object()
   if obj['/Subtype']=='/Image':
    width=math.hypot(ctm[0],ctm[1])/72; height=math.hypot(ctm[2],ctm[3])/72
    found.append({'pixels':[int(obj['/Width']),int(obj['/Height'])],'ppi':min(float(obj['/Width'])/width,float(obj['/Height'])/height)})
   elif obj['/Subtype']=='/Form':found+=images(obj,obj.get('/Resources',resources),reader,multiply([float(x) for x in obj.get('/Matrix',[1,0,0,1,0,0])],ctm))
 return found
checks=[]
for path in Path('tools/verification-qr-formats').glob('*.pdf'):
 r=PdfReader(path);expected=(288,432) if path.name.startswith('4x6') else (360,504) if path.name.startswith('5x7') else (612,792)
 assert len(r.pages)==1,(path,len(r.pages))
 p=r.pages[0]
 assert abs(float(p.mediabox.width)-expected[0])<1 and abs(float(p.mediabox.height)-expected[1])<1,(path,p.mediabox)
 raster=images(p.get_contents(),p['/Resources'],r)
 assert raster and min(i['ppi'] for i in raster)>=299.99,(path,raster)
 text=p.extract_text();assert 'THANKYOU' in ''.join(text.split()) and 'mementohouse.com/map/alice-sam' in text,(path,text)
 checks.append({'file':path.name,'page_points':expected,'images':raster})
Path('tools/verification-qr-formats/pdf-checks.json').write_text(json.dumps(checks,indent=2))
print(json.dumps({'pdfs':len(checks),'all_single_page':True,'minimum_embedded_ppi':min(i['ppi'] for c in checks for i in c['images'])}))

