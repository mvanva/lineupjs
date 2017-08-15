import {INumberColumn} from '../model/NumberColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {hsl} from 'd3';
import ICellRendererFactory from './ICellRendererFactory';


export default class HeatmapCellRenderer implements ICellRendererFactory {
  private static toHeatMapColor(d: any, index: number, col: INumberColumn & Column) {
    let v = col.getNumber(d, index);
    if (isNaN(v)) {
      v = 0;
    }
    //hsl space encoding, encode in lightness
    const color = hsl(col.color || Column.DEFAULT_COLOR);
    color.l = v;
    return color.toString();
  }

  createDOM(col: INumberColumn & Column): IDOMCellRenderer {
    return {
      template: `<div title="" class="heatmap ${col.cssClass}' style='background-color: ${col.color};"></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        attr(n, {
          title: col.getLabel(d.v, d.dataIndex)
        }, {
          'background-color': HeatmapCellRenderer.toHeatMapColor(d.v, d.dataIndex, col)
        });
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const w = context.rowHeight(i) - padding * 2;
      ctx.fillStyle = HeatmapCellRenderer.toHeatMapColor(d.v, d.dataIndex, col);
      ctx.fillRect(padding, padding, w, w);
    };
  }
}