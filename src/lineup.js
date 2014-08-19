/**
 * Global LineUp Variables
 * @property {d3.scale} columncolors - color scale for columns
 */
var LineUpGlobal = {
    colorMapping: d3.map(),
    columnColors: d3.scale.category20(),
    grayColor:"#666666",
    htmlLayout: {
        menuHeight: 25,
        menuHeightExpanded: 50,
        headerHeight: 50,
        windowOffsetX: 5,
        windowOffsetY: 5,
        headerOffsetY: function(){return (this.menuHeight + this.windowOffsetY + 3) },
        bodyOffsetY: function(){return (this.menuHeight + this.windowOffsetY + this.headerHeight +3) }

    },
    renderingOptions: {
        stacked:false
//        ,
//        animated:true
    },
    actionOptions: [
        {name:" new combined", icon:"fa-plus", action:"addNewStackedColumnDialog"},
        {name:" manage single", icon:"fa-sliders", action:"manageSingleColumnDialog"},
        {name:" save layout", icon:"fa-sliders", action:"saveLayout"}


    ],
    datasets:[],
    actualDataSet: [],
    lineUpRenderer:null,
//    sortingOrderAsc:false,
    primaryKey:"",

    headerUpdateRequired:true,
    columnBundles:{
        "primary":{
            sortedColumn:null,
            sortingOrderAsc:true
        },
        "secondary":{
            sortedColumn:[],
            sortingOrderAsc:true
        }
    },

    svgLayout:{
      rowHeight:20,
      plusSigns:{
          addStackedColumn: {
              title: "add stacked column",
              action:"addNewEmptyStackedColumn",
              x: 0, y: 2,
              w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
          }
      } // description of all plus signs ! -- names: addStackedColumn,...
    },
    modes:{
        stackedColumnModified:null,
        columnDragged:null
    }


};

/**
 * Constructor to Create a LineUp Visualization
 * @param spec - the specifications object
 * @param spec.storage - a LineUp Storage, see {@link LineUpLocalStorage}
 * @constructor
 */
var LineUp = function(spec){
    this.storage = spec.storage;
//    this.sortedColumn = [];


    var that = this;


    /*
    * define dragging behaviour for header weights
    * */

    function dragWeightStarted() {
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    }


    function draggedWeight() {
        var newValue = Math.max(d3.mouse(this.parentNode)[0],2);
        that.reweightHeader({column:d3.select(this).data()[0], value:newValue})
        that.updateBody(that.storage.getColumnLayout(), that.storage.getData())
    }

    function dragWeightEnded() {
        d3.select(this).classed("dragging", false);
        if (LineUpGlobal.columnBundles.primary.sortedColumn instanceof LayoutStackedColumn){
            that.storage.resortData({column: LineUpGlobal.columnBundles.primary.sortedColumn});
            that.updateBody(that.storage.getColumnLayout(), that.storage.getData());
        }
//        that.updateBody(that.storage.getColumnLayout(), that.storage.getData())

        // TODO: integrate columnbundles dynamically !!
    }


    this.dragWeight= d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", dragWeightStarted)
        .on("drag", draggedWeight)
        .on("dragend", dragWeightEnded);



};

LineUp.prototype.changeDataStorage= function(spec){
//    d3.select("#lugui-table-header-svg").selectAll().remove();
    this.storage = spec.storage;
    this.sortedColumn = [];
    this.startVis();
}


/**
 * the function to start the LineUp visualization
 */
LineUp.prototype.startVis = function(){

    this.updateMenu();
    this.assignColors(this.storage.getRawColumns());
    this.updateHeader(this.storage.getColumnLayout());
    console.log(this.storage.getData());
    this.updateBody(this.storage.getColumnLayout(), this.storage.getData())

}


LineUp.prototype.updateMenu = function () {
    var kv = getKeyValueFromObject(LineUpGlobal.renderingOptions)

    var that = this;
    var kvNodes =d3.select("#lugui-menu-rendering").selectAll("span").data(kv,function(d){return d.key;})
    kvNodes.exit().remove();
    kvNodes.enter().append("span").on({
        "click":function(d){
            LineUpGlobal.renderingOptions[d.key] = !LineUpGlobal.renderingOptions[d.key]
            that.updateMenu();
            that.updateHeader(that.storage.getColumnLayout())
            that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), true)
        }
    })
    kvNodes.html(function(d){
        return '<a href="#"> <i class="fa '+ (d.value?'fa-check-square-o':'fa-square-o')+'" ></i> '+ d.key+'</a>&nbsp;&nbsp;'
    })

    var actionNodes = d3.select("#lugui-menu-actions").selectAll("span").data(LineUpGlobal.actionOptions)
        .enter().append("span").html(
        function(d){
            return '<i class="fa '+ (d.icon)+'" ></i>'+ d.name+'&nbsp;&nbsp;'
        }
    ).on("click", function (d) {
            console.log(d.action);
            that[d.action](d);
        })





}


var layoutHTML= function(){
    //add svgs:
    d3.select("#lugui-table-header").append("svg").attr({
        id:"lugui-table-header-svg",
        width:($(window).width()),
        height:LineUpGlobal.htmlLayout.headerHeight
    })

    d3.select("#lugui-table-body").append("svg").attr({
        id:"lugui-table-body-svg",
        width:($(window).width())
    })

    // constant layout attributes:
    $("#lugui-menu").css({
        "top" : LineUpGlobal.htmlLayout.windowOffsetY +"px",
        "left" : LineUpGlobal.htmlLayout.windowOffsetX+"px",
        "height": LineUpGlobal.htmlLayout.menuHeight+"px"
    })
    $("#lugui-table-header").css({
        "top" : LineUpGlobal.htmlLayout.headerOffsetY() +"px",
        "left" : LineUpGlobal.htmlLayout.windowOffsetX+"px",
        "height": LineUpGlobal.htmlLayout.headerHeight+"px"
    })

    $("#lugui-table-body-wrapper").css({
        "top" : LineUpGlobal.htmlLayout.bodyOffsetY()+"px",
        "left" : LineUpGlobal.htmlLayout.windowOffsetX+"px"
    })



    // ----- Adjust UI elements...
    var resizeGUI = function(){
        d3.selectAll("#lugui-menu, #lugui-table-header, #lugui-table-body-wrapper").style({
            "width": ($(window).width() - 2* LineUpGlobal.htmlLayout.windowOffsetX)+"px"
        });
        d3.selectAll("#lugui-table-header-svg, #lugui-table-body-svg").attr({
            "width": ($(window).width()- 2* LineUpGlobal.htmlLayout.windowOffsetX)
        });
        d3.select("#lugui-table-body-wrapper").style({
            "height": ($(window).height()-LineUpGlobal.htmlLayout.bodyOffsetY())+"px"
        });
    };

    // .. on window changes...
    $(window).resize(function(){
        resizeGUI();
    });

    // .. and initially once.
    resizeGUI();



}

LineUp.prototype.updateAll =function(){
    var that = this;
    that.updateHeader(that.storage.getColumnLayout());
    that.updateBody(that.storage.getColumnLayout(), that.storage.getData());

}


// document ready
$(
    function () {


    layoutHTML();


    var loadDataset = function(ds){
        d3.json(ds.baseURL+"/"+ds.descriptionFile, function(desc) {

            LineUpGlobal.primaryKey = desc.primaryKey;

            d3.tsv(ds.baseURL+"/"+desc.file, function(_data) {
                var spec = {};
                spec.storage = new LineUpLocalStorage("#wsv", _data, desc.columns, desc.layout);

                if (LineUpGlobal.lineUpRenderer){
                    LineUpGlobal.lineUpRenderer.changeDataStorage(spec)
                }else{
                    LineUpGlobal.lineUpRenderer = new LineUp(spec);
                    LineUpGlobal.lineUpRenderer.startVis();
                }


            });

        })
    }



    d3.json("datasets.json", function(error,data){
        console.log("datasets:", data, error);

        LineUpGlobal.datasets = data.datasets;
        var ds = d3.select("#lugui-dataset-selector").selectAll("option").data(data.datasets)
        ds.enter().append("option")
        .attr({
            value:function(d,i){return i;}
        }).text(function(d){return d.name;})


        document.getElementById('lugui-dataset-selector').addEventListener('change', function () {
            loadDataset(LineUpGlobal.datasets[document.getElementById('lugui-dataset-selector').value])

        });

        //and start with 0:
        loadDataset(LineUpGlobal.datasets[0]);


    });





})


LineUp.prototype.saveLayout = function(){
    var x = this.storage.getColumnLayout()
        .filter(function(d){
            return true;
//            return !(d instanceof LayoutRankColumn) ;
        })
        .map(function(d){return d.description();})
    console.log(x);
    var t = JSON.stringify(x);

    newColDesc = JSON.parse(t)


    var layoutColumnTypes = {
        "single": LayoutSingleColumn,
        "stacked": LayoutStackedColumn,
        "rank": LayoutRankColumn
    }

    var that = this;
    function toLayoutColumn(desc){
        var type = desc.type || "single";
        return new layoutColumnTypes[type](desc,that.storage.getRawColumns(), toLayoutColumn)
    }

    // create Rank Column
//            new LayoutRankColumn();



    var layoutColumns = newColDesc.map(toLayoutColumn);
    console.log(layoutColumns);



    var copy =this.storage.getColumnLayout()
        .filter(function(d){return !(d instanceof LayoutRankColumn) ;})
        .map(function(d){return d.makeCopy();})


    console.log(copy);


}


function getKeyValueFromObject(o){
    return Object.keys(o).map(function (key) {
        return {key:key, value:o[key]};
    })
}

