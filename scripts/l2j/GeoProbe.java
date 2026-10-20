import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.GZIPInputStream;
import org.l2jmobius.gameserver.geoengine.geodata.IBlock;
import org.l2jmobius.gameserver.geoengine.geodata.blocks.ComplexBlock;
import org.l2jmobius.gameserver.geoengine.geodata.blocks.FlatBlock;
import org.l2jmobius.gameserver.geoengine.geodata.blocks.MultilayerBlock;

/** Development-only oracle using the original, unmodified High Five block classes. */
public class GeoProbe {
 public static void main(String[] args) throws Exception {
  byte[] bytes;
  try(InputStream input=new GZIPInputStream(Files.newInputStream(Path.of(args[0])))){bytes=input.readAllBytes();}
  ByteBuffer data=ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
  IBlock[] blocks=new IBlock[65536];
  for(int i=0;i<blocks.length;i++){
   switch(data.get()){
    case 0: blocks[i]=new FlatBlock(data);break;
    case 1: blocks[i]=new ComplexBlock(data);break;
    case 2: blocks[i]=new MultilayerBlock(data);break;
    default: throw new IllegalArgumentException("Unknown L2J block type");
   }
  }
  for(String line:Files.readAllLines(Path.of(args[1]))){
   String[] point=line.split(",");int x=Integer.parseInt(point[0]),y=Integer.parseInt(point[1]),z=Integer.parseInt(point[2]);
   int gx=(x+655360)/16,gy=(y+589824)/16;
   IBlock block=blocks[((gx/8)%256)*256+((gy/8)%256)];
   int height;
   if(block instanceof MultilayerBlock){
    // Compare the stored layer, before GeoEngine's virtual-height fallback.
    var nearest=MultilayerBlock.class.getDeclaredMethod("getNearestLayer",int.class,int.class,int.class);
    var decode=MultilayerBlock.class.getDeclaredMethod("extractLayerHeight",short.class);
    nearest.setAccessible(true);decode.setAccessible(true);
    short layer=(short)nearest.invoke(block,gx,gy,z);height=(int)decode.invoke(block,layer);
   }else height=block.getNearestZ(gx,gy,z);
   System.out.println(height+","+block.getNearestNswe(gx,gy,z));
  }
 }
}
