import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import clsx from 'clsx';
import { remote } from 'electron';
import { useRouter } from 'next/router';
import { ipcRenderer } from 'electron';
import { ArrowDownward, ArrowUpward, ChevronLeft, ChevronRight, Equalizer } from '@material-ui/icons';
import { Drawer, List, Divider, Card, Typography, Button } from '@material-ui/core';
import useLeftBarStyles from '../styles/yz.styles';
import { template } from '../components/MenuTemplate';
import AudioDataContainer from '../components/AudioContainer';

const LeftBar = () => {
  if (typeof window === 'undefined') {
    return <>server-side-rendered</>
  }

  const classes = useLeftBarStyles();
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [drawerBottomOpen, setDrawerBottomOpen] = useState(false)
  const router = useRouter()
  const [iframe, setIframe] = useState(router.query.ip || (typeof window !== 'undefined' && window.localStorage.getItem("wled-manager-ip")) || '')
  const [combNodes, setCombNodes] = useState([])
  const [nodes, setNodes] = useState([])
  const [node, setNode] = useState('')
  const [isZeroConf, setIsZeroConf] = useState(router.query.zeroconf || (typeof window !== 'undefined' && window.localStorage.getItem("wled-manager-zeroconf") === 'true') || false)

  useEffect(() => {
    const { Menu } = remote;
    const customTitleBar = require('custom-electron-titlebar');
    const titlebar = new customTitleBar.Titlebar({
      backgroundColor: customTitleBar.Color.fromHex('#444'),
      icon: '/images/logo.png',
    });
    const temp = template()
    const menu = Menu.buildFromTemplate(temp)
    titlebar.updateMenu(menu);

    return () => {
      titlebar.dispose();
    };
  }, []);

  useEffect(() => {
    ipcRenderer.send('resize-me-please', [1024, 1080])
  }, [])

  useEffect(() => {
    if (router.query && router.query.zeroconf) {
      setIsZeroConf(true)
    }
  }, [router.query.zeroconf])

  useEffect(() => {
    if (!isZeroConf) {
      node && setCombNodes([...nodes, {
        "name": node.name,
        "type": node.arch === "esp8266" ? 82 : 32,
        "ip": iframe,
        "vid": node.vid
      }])
    }
  }, [nodes, node])

  let bonjour = null;
  useEffect(() => {
    if (isZeroConf) {
      bonjour = require('bonjour')()
      bonjour.find({ type: 'wled' }, async (service) => {
        if (service.referer && service.referer.address) {
          if (combNodes.filter(n => n.ip === service.referer.address).length > 0) {
            console.log(service.name, " already exsists")
          } else {
            console.log("wled found:", service.name)
            await fetch(`http://${service.referer.address}/json/info`)
              .then(r => r.json())
              .then((re) => {
                setCombNodes((nodes) => [...nodes, {
                  "name": service.name,
                  "type": re.arch === "esp8266" ? 82 : 32,
                  "ip": service.referer.address,
                  "vid": re.vid,
                  "pixel_count": re.leds.count
                }])
              })
          }
        }
      })
    } else {
      fetch(`http://${iframe}/json/nodes`)
        .then(r => r.json())
        .then((res) => setNodes(res.nodes));
      fetch(`http://${iframe}/json/info`)
        .then(r => r.json())
        .then((re) => { setNode(re) }).catch((error) => console.log("YZ-ERROR", error));
      if (router.query && router.query.ip) {
        setIframe(router.query.ip)
      }
    }

    return () => {
      if (isZeroConf) {
        bonjour.destroy()
      }
    }
  }, [])

  return (<>
    <Head>
      <title>WLED Manager - by Blade</title>
    </Head>

    <Drawer
      className={classes.drawer}
      variant="persistent"
      anchor="left"
      open={drawerOpen}
      classes={{ paper: clsx(classes.drawerPaper, classes.noselect, { [classes.contentBottomShift]: !drawerBottomOpen }) }}
    >
      <div className={classes.drawerHeader}>
        <div style={{ paddingLeft: '16px' }}>
          <Typography variant="h6" onClick={() => window.reload()}>
            WLED Manager
          </Typography>
        </div>
      </div>
      <Divider />
      <div style={{ padding: '0.25rem 0.25rem 0.25rem 1rem' }}>
        <Typography variant="h6" color="textSecondary">
          Devices
        </Typography>
      </div>
      <Divider />
      <List style={{ flexGrow: 1 }}>
        {combNodes.length > 0 && combNodes.map((d, i) => (

          <Card key={i} onClick={() => {
            setIframe(combNodes[i].ip)
          }} style={{ cursor: 'pointer', margin: '0.5rem', padding: '0.5rem 0.25rem 0.5rem 0.5rem', background: combNodes[i].ip === iframe ? '#404040' : '#202020' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography style={{ color: "#fff", fontSize: '1rem', maxWidth: 150, overflowX: 'hidden', whiteSpace: 'nowrap' }}>
                {combNodes[i].name}
              </Typography>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Button disabled variant="outlined" size="small" style={{ minWidth: 50, padding: '0', flexGrow: 0, fontSize: 'xx-small' }}>
                  {combNodes[i].type === 32 ? 'ESP32' : 'ESP8266'}
                </Button>
                <Button disabled variant="outlined" size="small" style={{ minWidth: 50, padding: '0', flexGrow: 0, fontSize: 'xx-small' }}>
                  {combNodes[i].pixel_count} Leds
                </Button>
              </div>
            </div>
          </Card>
        ))}
        <Divider style={{ marginTop: '2rem' }} />
        <div style={{ padding: '0.25rem 0.25rem 0.25rem 1rem' }}>
          <Typography variant="h6" color="textSecondary">
            Virtuals
          </Typography>
        </div>
        <Divider />
        <Card key={"test1"} style={{ cursor: 'pointer', margin: '0.5rem', padding: '0.5rem 0.25rem 0.5rem 0.5rem', background: '#202020' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography style={{ color: "#fff", fontSize: '1rem' }}>
              Dummy Virtual 1
            </Typography>
            <Button disabled variant="outlined" size="small" style={{ padding: '0', flexGrow: 0, fontSize: 'xx-small' }}>
              span
            </Button>
          </div>
        </Card>
        <Card key={"test2"} style={{ cursor: 'pointer', margin: '0.5rem', padding: '0.5rem 0.25rem 0.5rem 0.5rem', background: '#202020' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography style={{ color: "#fff", fontSize: '1rem' }}>
              Dummy Virtual 2
            </Typography>
            <Button disabled variant="outlined" size="small" style={{ padding: '0', flexGrow: 0, fontSize: 'xx-small' }}>
              copy
            </Button>
          </div>
        </Card>
      </List>
      <Divider />
      <Button endIcon={drawerBottomOpen ? <ArrowDownward /> : <ArrowUpward />} startIcon={<Equalizer/>} onClick={() => setDrawerBottomOpen(!drawerBottomOpen)} style={{ lineHeight: '17px'}}>
        WebAudio
      </Button>
      <Divider />

      <div style={{ height: 61, padding: '0 0.5rem' }}>
        <div style={{ display: 'flex' }}>
          <Typography onClick={() => router.push('/home')} gutterBottom variant="subtitle2" style={{ color: "#444" }}>
            {'.'}
          </Typography>
          <Typography variant="subtitle2" style={{ color: "#444" }}>
            {'...'}
          </Typography>
          <Typography onClick={() => window && window.localStorage.removeItem("wled-manager-ip")} gutterBottom variant="subtitle2" style={{ color: "#444" }}>
            {'.'}
          </Typography>
        </div>
        <Typography variant="subtitle2" style={{ color: "#444" }}>
          by Blade
        </Typography>
      </div>
    </Drawer>
    <Drawer
      className={classes.drawerBottom}
      variant="persistent"
      anchor="bottom"
      open={drawerBottomOpen}
      classes={{ paper: classes.drawerBottomPaper }}
    > 
    {/* <div style={{ height: 'calc(100vh - 355px)'}}>
    </div> */}
      <AudioDataContainer />
      
    </Drawer>
    <main className={clsx(classes.content, classes.contentBottom, { [classes.contentShift]: !drawerOpen }, { [classes.contentBottomShift]: !drawerBottomOpen })}>
      <div className={clsx(classes.menuButton, { [classes.contentShift]: !drawerOpen }, { [classes.contentBottomShift]: !drawerOpen })}>
        <Button onClick={() => setDrawerOpen(!drawerOpen)} style={{ flex: 1, minWidth: 'unset' }}>
          {drawerOpen ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div>
      <iframe src={`http://${iframe}/`} width="100%" height="100%" style={{ border: 0 }} />
    </main>
  </>
  );
};

export default LeftBar;
