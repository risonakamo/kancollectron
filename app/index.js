const {ipcRenderer}=require("electron");

window.onload=main;

//html element globals
var _expFleets; //array
var _fleetShips; //array
var _mainFace;
var _rDocks;

//player api from require info
var _apiShip; //ships of player
var _apiShip_ready;
var _apiEquip; //equipment of player

//api Alls (from api start)
var _apistart_ready;
var _apiAllShip;
var _apiAllEquip;
var _apiAllExpedition;

var _expPerLv=[100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,
              1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000,3100,3200,3300,
              3400,3500,3600,3700,3800,3900,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,5000,
              5200,5400,5600,5800,6000,6200,6400,6600,6800,7000,7300,7600,7900,8200,8500,8800,9100,
              9400,9700,10000,10400,10800,11200,11600,12000,12400,12800,13200,13600,14000,14500,15000,
              15500,16000,16500,17000,17500,18000,18500,19000,20000,22000,25000,30000,40000,60000,90000,148500];

function main()
{
    setupInput();
    ipcReceivers();

    _expFleets=document.querySelectorAll("exp-fleet");
    _fleetShips=document.querySelectorAll("fleet-ship");
    _mainFace=document.querySelector(".main-face");
    _rDocks=document.querySelectorAll("repair-box");

    expBoxEvents();
}

//setup for inital input screen
function setupInput()
{
    var goBt=document.querySelector(".go-bt");
    var urlBox=document.querySelector(".url-box");
    var inputWrap=document.querySelector(".input-wrap");
    var viewer=document.querySelector(".viewer");

    var sendWindowRequest=function(e){
        ipcRenderer.send("requestWindow",urlBox.value);
        inputWrap.parentNode.removeChild(inputWrap);
        viewer.classList.remove("collapse");
    };

    goBt.addEventListener("click",sendWindowRequest);

    urlBox.addEventListener("keypress",(e)=>{
        if (e.key=="Enter")
        {
            e.preventDefault();
            sendWindowRequest();
        }
    });
}

//receives from main process
function ipcReceivers()
{
    ipcRenderer.on("portinfo",(err,res)=>{
        portUpdate(res);
    });

    ipcRenderer.on("deckinfo",(err,res)=>{
        expeditionUpdate(res.api_data);
    });

    ipcRenderer.on("charge",(err,res)=>{
        chargeUpdate(res);
    });

    ipcRenderer.once("requireinfo",(err,res)=>{
        _apiEquip={};
        for (var x=0,l=res.api_data.api_slot_item.length;x<l;x++)
        {
            _apiEquip[res.api_data.api_slot_item[x].api_id]=res.api_data.api_slot_item[x];
        }
    });    

    ipcRenderer.once("apistart",(err,res)=>{
        // _apistart=res.api_data;

        _apiAllShip={};
        for (var x=0;x<=465;x++)
        {
            _apiAllShip[res.api_data.api_mst_ship[x].api_sortno]=res.api_data.api_mst_ship[x];
        }

        _apiAllEquip={};
        for (var x=0;x<=228;x++)
        {
            _apiAllEquip[res.api_data.api_mst_slotitem[x].api_sortno]=res.api_data.api_mst_slotitem[x];
        }

        _apiAllExpedition=res.api_data.api_mst_mission;

        _apistart_ready=1;
    });    
}

//main port update function to handle port requests
function portUpdate(port)
{
    if (_apistart_ready!=1)
    {
        setTimeout(()=>{portUpdate(port)},500);
        return;
    }

    expeditionUpdate(port.api_data.api_deck_port);

    processApiShip(port.api_data.api_ship);

    for (var x=0;x<4;x++)
    {
        updateFleetShip(port.api_data.api_deck_port[x].api_ship,x);
    }

    rDockUpdate(port.api_data.api_ndock);
}

//parse array of raw api_ships into api ship object, where keys are ship id
function processApiShip(apiship)
{
    _apiShip_ready=0;
    _apiShip={};

    for (var x=0,l=apiship.length;x<l;x++)
    {
        _apiShip[apiship[x].api_id]=apiship[x];
    }

    _apiShip_ready=1;
}

//ships is array of 6 from fleet
function updateFleetShip(ships,fleetContain)
{
    if (_apiShip_ready!=1)
    {
        setTimeout(()=>{updateFleetShip(ships,fleetContain)},100);
        return;
    }

    for (var x=0;x<6;x++)
    {
        if (ships[x]==-1)
        {
            continue;
        }

        ships[x]=_apiShip[ships[x]];
    }

    if (fleetContain==0)
    {
        _mainFace.src=`face/${ships[0].api_ship_id}.png`;
    }

    else
    {
        _expFleets[fleetContain-1].face=`face/${ships[0].api_ship_id}.png`;
    }

    fleetContain*=6;
    for (var x=0;x<6;x++)
    {
        if (ships[x]==-1)
        {
            _fleetShips[fleetContain].unload();
        }

        else
        {
            _fleetShips[fleetContain].loadShip({
                maxHp:ships[x].api_maxhp,
                curHp:ships[x].api_nowhp,
                level:ships[x].api_lv,
                face:`face/${ships[x].api_ship_id}.png`,
                morale:ships[x].api_cond,
                curAmmo:ships[x].api_bull,
                curGas:ships[x].api_fuel,
                maxAmmo:_apiAllShip[ships[x].api_sortno].api_bull_max,
                maxGas:_apiAllShip[ships[x].api_sortno].api_fuel_max,
                equipment:genEquip(ships[x].api_slot),
                curExp:ships[x].api_exp[1],
                maxExp:_expPerLv[ships[x].api_lv-1],
                planeCount:ships[x].api_onslot,
                shipId:ships[x].api_id
            });
        }
        
        fleetContain++;
    }
}

//give array of equipment ids of a ship, returns string form
function genEquip(apishipEquip)
{
    var stringequip=[];
    for (var x=0;x<4;x++)
    {
        if (apishipEquip[x]<0)
        {
            stringequip.push("");
            continue;
        }

        stringequip.push(`equipment/${_apiAllEquip[_apiEquip[apishipEquip[x]].api_slotitem_id].api_type[3]}.png`);
    }

    return stringequip;
}

//needs to be given api_deck_port from the port object, an array
function expeditionUpdate(data)
{
    // if (_apistart_ready!=1)
    // {
    //     setTimeout(()=>{expeditionUpdate(data)},100);
    //     return;
    // }

    for (var x=1;x<=3;x++)
    {
        if (data[x].api_mission[0]==0)
        {
            _expFleets[x-1].clearExpedition();
            continue;
        }

        _expFleets[x-1].loadExp({
            expNum:data[x].api_mission[1],
            timeComplete:data[x].api_mission[2],
            maxTime:_apiAllExpedition[data[x].api_mission[1]-1].api_time
        });
    }    
}

//needs array of ship data to be updated
function updateShipdata(update)
{
    for (var x=0;x<update.length;x++)
    {
        _apiShip[update[x].api_id]=update[x];
    }
}

function chargeUpdate(data)
{
    for (var x=0,l=data.api_data.api_ship.length;x<l;x++)
    {
        for (var y in data.api_data.api_ship[x])
        {
            if (y=="api_id")
            {
                continue;
            }

            _apiShip[data.api_data.api_ship[x].api_id][y]=data.api_data.api_ship[x][y];
        }
    }

    var update=[-1,-1,-1,-1,-1,-1];
    for (var x=0,l=data.api_data.api_ship.length;x<l;x++)
    {
        update[x]=data.api_data.api_ship[x].api_id;
    }

    for (var x=0;x<=24;x+=6)
    {
        if (_fleetShips[x].shipId==data.api_data.api_ship[0].api_id)
        {
            updateFleetShip(update,x/6);
            return;
        }
    }
}

function expBoxEvents()
{
    var slider=document.querySelector(".fleet-slider");
    var mainfleet=document.querySelector(".main-fleet");

    _expFleets.forEach((x,i)=>{
        x.addEventListener("click",(e)=>{
            if (x.classList.contains("selected"))
            {
                return;
            }

            slider.style.transform=`translateY(-${(360*i)+360}px)`;

            x.classList.add("selected");

            mainfleet.classList.remove("selected");
            for (var y=0;y<3;y++)
            {
                if (y!=i)
                {
                    _expFleets[y].classList.remove("selected");
                }                
            }
        });                
    });

    mainfleet.addEventListener("click",(e)=>{
        if (mainfleet.classList.contains("selected"))
        {
            return;
        }

        slider.style.transform=`translateY(0px)`;

        mainfleet.classList.add("selected");

        for (var x=0;x<3;x++)
        {
            _expFleets[x].classList.remove("selected");
        }
    });

    // for (var x=0;x<3;x++)
    // {
    //     _expFleets[x].addEventListener("click",(e)=>{
    //         slider.style.transform=`translateY(-${350*x}px)`;
    //     });
    // }
}

//requires api ndock (array) directly from port api
function rDockUpdate(data)
{
    if (_apiShip_ready!=1)
    {
        setTimeout(()=>{rDockUpdate(data)},100);
        return;
    }

    for (var x=0;x<2;x++)
    {
        if (data[x].api_state<=0 || _rDocks[x].loaded==1)
        {
            continue;
        }

        _rDocks[x].loadShip({
            face:`face/${_apiShip[data[x].api_ship_id].api_ship_id}.png`,
            timeComplete:data[x].api_complete_time,
            maxTime:_apiShip[data[x].api_ship_id].api_ndock_time
        });
    }
}