import ICellRendererFactory from './ICellRendererFactory';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import Column from '../model/Column';


export default class UpSetCellRenderer implements ICellRendererFactory {
  private static calculateSetPath(setData: boolean[], cellDimension: number) {

    const catindexes: number[] = [];
    setData.forEach((d: boolean, i: number) => (d) ? catindexes.push(i) : -1);

    const left = (catindexes[0] * cellDimension) + (cellDimension / 2);
    const right = (catindexes[catindexes.length - 1] * cellDimension) + (cellDimension / 2);

    return {left, right};
  }


  createDOM(col: ICategoricalColumn & Column): IDOMCellRenderer {
    const dataLength = col.categories.length;
    let templateRows = '';
    for (let i = 0; i < dataLength; ++i) {
      templateRows += `<div></div>`;
    }
    return {
      template: `<div><div></div>${templateRows}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const values = new Set(col.getCategories(d.v, d.dataIndex));
        const value = col.categories.map((cat) => values.has(cat));

        Array.from(n.children).slice(1).forEach((d, i) => {
          const v = value[i];
          attr(<HTMLElement>d, {
            'class': v ? 'enabled' : ''
          });
        });

        const line = <HTMLElement>n.firstElementChild;
        const left = value.findIndex((d) => d);
        const right = (value.length - 1) - value.reverse().findIndex((d) => d);

        if (left < 0 || left === right) {
          line.style.display = 'none';
          return;
        }
        line.style.display = null;
        line.style.left = `${Math.round(100 * (left + 0.5)/value.length)}%`;
        line.style.width = `${Math.round(100 * (right - left)/value.length)}%`;
      }
    };
  }

  createCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const dataLength = col.categories.length;
    const cellDimension = context.colWidth(col) / dataLength;

    const upsetCircle = context.option('style.upset.circle', 'black');
    const upsetInactive = context.option('style.upset.inactiveOpacity', 0.1);
    const upsetStroke = context.option('style.upset.stroke', 'black');


    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      // Circle
      const values = new Set(col.getCategories(d.v, d.dataIndex));
      const data = col.categories.map((cat) => values.has(cat));
      const hasTrueValues = data.some((d) => d); //some values are true?
      const rowHeight = context.rowHeight(i);
      const radius = (rowHeight / 3);

      ctx.save();
      ctx.fillStyle = upsetCircle;
      ctx.strokeStyle = upsetStroke;
      if (hasTrueValues) {
        const {left, right} = UpSetCellRenderer.calculateSetPath(data, cellDimension);
        ctx.beginPath();
        ctx.moveTo(left, rowHeight / 2);
        ctx.lineTo(right, rowHeight / 2);
        ctx.stroke();
      }

      data.forEach((d, j) => {
        const posy = (rowHeight / 2);
        const posx = (j * cellDimension) + (cellDimension / 2);
        ctx.beginPath();
        ctx.globalAlpha = d ? 1 : upsetInactive;
        ctx.arc(posx, posy, radius, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.restore();
    };
  }

}
