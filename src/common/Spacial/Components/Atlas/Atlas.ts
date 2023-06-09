import { onMounted, onUnmounted, ref } from "vue"
import { Spacial } from "../../Spacial"
import { AActor } from "@/libs/AActor"
import { Point } from "./Core/Point"
import { Line } from "./Core/Line"

class Atlas extends AActor {
    public constructor(parent: Spacial) {
        super()
        this.parent = parent
    }

    private parent!: Spacial

    private dom = ref<HTMLElement | null>(null)

    public viewer!: Cesium.Viewer

    private handler: Cesium.ScreenSpaceEventHandler | null = null

    private isMouseDown = false

    private points = ref<Map<string, Point>>(new Map<string, Point>())

    private currentDragPoint: Point | null = null

    private line!: Line

    public InitStates() {
        return {
            dom: this.dom,
        }
    }

    public InitHooks() {

    }

    public Run() {
        onMounted(() => {
            this.InitCesiumToken()
            this.InitViewer()
            this.InitController()
            this.InitHandler()
            this.InitLine()
            this.ToTargetPosition(117.23, 31.82)
        })

        onUnmounted(() => {
            this.Destroy()
        })
    }

    protected Destroy() {

    }

    private InitCesiumToken() {
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMmEzNjY1My1iNTE0LTQ4MDctYjMyNy00ZGM5ZDU5MGQxZGYiLCJpZCI6Njc2OTYsImlhdCI6MTYzMTk0NjY0Mn0.RDGEPdwy5l3NuDiTWPem_b38M7fHImVZUPSui0D7Q80'
    }

    private InitViewer() {
        if (this.dom.value) {
            const res = [
                'a97aa8d9962bd7bc0d768f35aa2c3a12',
                '1f048c408cdab4c499f03ce3675af1f1',
                '31381896e06a173f122aa53fd7500ed7',
                'c08f9b3d03a67227e473dc6c3bcd0be3',
                'ee4a77e07dcdeb84e2c739641d236cbd'
            ]
            let tiandituTk = res[Math.floor(Math.random() * 5)]
            let subdomains = ['0', '1', '2', '3', '4', '5', '6', '7']
            this.viewer = new Cesium.Viewer(this.dom.value, {
                // sceneMode: Cesium.SceneMode.COLUMBUS_VIEW,
                useDefaultRenderLoop: true, // 是否让Cesium自己刷新
                geocoder: false, //右上角 搜索
                homeButton: false, //右上角 Home
                sceneModePicker: false, //右上角 2D/3D切换
                baseLayerPicker: false, //右上角 地形
                navigationHelpButton: false, //右上角 Help
                animation: false, // 左下角 圆盘动画控件
                timeline: false, //时间轴
                fullscreenButton: false, //右下角 全屏控件
                vrButton: false, // 如果设置为true，将创建VRButton小部件。
                scene3DOnly: true, // 每个几何实例仅以3D渲染以节省GPU内存
                infoBox: false, //隐藏点击要素后的提示信息

                // 下面为LOD配置加载 和一些选项  在加载B3DM也会有一些配置项
                selectionIndicator: false,
                navigationInstructionsInitiallyVisible: false,
                contextOptions: {
                    webgl: {
                        alpha: false,
                        antialias: true,
                        preserveDrawingBuffer: true,
                        failIfMajorPerformanceCaveat: false,
                        depth: true,
                        stencil: false,
                        anialias: false
                    }
                },
                shadows: false,
                showRenderLoopErrors: true,
                targetFrameRate: 60,
                orderIndependentTranslucency: true,
                // 地图地图提供者  后期可改
                imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
                    //影像底图
                    url: "https://t{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=" + tiandituTk,
                    subdomains: subdomains,
                    layer: "tdtImgLayer",
                    style: "default",
                    format: "image/jpeg",
                    tileMatrixSetID: "GoogleMapsCompatible",
                    maximumLevel: 18
                }),
                automaticallyTrackDataSourceClocks: false,
                terrainShadows: Cesium.ShadowMode.DISABLED,
                projectionPicker: false,
                requestRenderMode: false,
            })
            this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
                //影像注记
                url: "https://t{s}.tianditu.gov.cn/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=" + tiandituTk,
                subdomains: subdomains,
                layer: "tdtCiaLayer",
                style: "default",
                format: "image/jpeg",
                tileMatrixSetID: "GoogleMapsCompatible",
                maximumLevel: 18
            }));
            this.viewer.scene.debugShowFramesPerSecond = false
            this.viewer.scene.postProcessStages.fxaa.enabled = false
            this.viewer.scene.globe.depthTestAgainstTerrain = true
        }
    }

    private InitController() {
        if (this.viewer) {
            this.viewer.scene.screenSpaceCameraController.zoomEventTypes = [
                Cesium.CameraEventType.WHEEL,
                Cesium.CameraEventType.PINCH
            ]
            this.viewer.scene.screenSpaceCameraController.tiltEventTypes = [
                Cesium.CameraEventType.PINCH,
                Cesium.CameraEventType.RIGHT_DRAG
            ]
            this.viewer.trackedEntityChanged.addEventListener(() => {
                if (this.viewer) {
                    this.viewer.trackedEntity = undefined
                }
            })
        }
    }

    private InitHandler() {
        if (this.viewer) {
            this.handler = new Cesium.ScreenSpaceEventHandler(
                this.viewer.scene.canvas
            )

            this.handler.setInputAction(
                (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
                    this.MapLeftClick(e)
                },
                Cesium.ScreenSpaceEventType.LEFT_CLICK,
            )

            this.handler.setInputAction(
                (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
                    this.MapMidClick(e)
                }, Cesium.ScreenSpaceEventType.MIDDLE_CLICK)

            this.handler.setInputAction(
                (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
                    this.MapRightClick(e)
                },
                Cesium.ScreenSpaceEventType.RIGHT_CLICK
            )

            this.handler.setInputAction(
                (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
                    this.MapLeftDown(e)
                },
                Cesium.ScreenSpaceEventType.LEFT_DOWN
            )

            this.handler.setInputAction(
                (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
                    this.MapLeftUp(e)
                },
                Cesium.ScreenSpaceEventType.LEFT_UP
            )

            this.handler.setInputAction(
                (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
                    this.MapMouseMove(e)
                },
                Cesium.ScreenSpaceEventType.MOUSE_MOVE,
            )

            this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
        }
    }

    private InitLine() {
        this.line = new Line({ atlas: this })
    }

    private MapLeftClick(e: Cesium.ScreenSpaceEventHandler.PositionedEvent) {
        const r = this.GetPickAndPosition(e.position)
        if (r.pick && r.pick.id && r.pick.id.type == "Point") {
            const point = r.pick.id.body as Point
            point.OnLeftClick()
        }
        else {
            this.AddPoint(r.tp)
            this.Updateline()
        }

    }

    private MapMidClick(e: Cesium.ScreenSpaceEventHandler.PositionedEvent) {
        const r = this.GetPickAndPosition(e.position)
        if (r.pick && r.pick.id && r.pick.id.type == "Point") {
            const point = r.pick.id.body as Point
            point.OnMidClick()
        }
    }

    private MapRightClick(e: Cesium.ScreenSpaceEventHandler.PositionedEvent) {
        const r = this.GetPickAndPosition(e.position)
        if (r.pick && r.pick.id && r.pick.id.type == "Point") {
            const point = r.pick.id.body as Point
            point.OnRightClick()
        }
    }

    private MapLeftDown(e: Cesium.ScreenSpaceEventHandler.PositionedEvent) {
        this.isMouseDown = true
        const r = this.GetPickAndPosition(e.position)
        if (r.pick && r.pick.id && r.pick.id.type == "Point") {
            const point = r.pick.id.body as Point
            this.currentDragPoint = point
            point.OnMouseDown()
            point.OnDragStart()
        }
    }

    private MapLeftUp(e: Cesium.ScreenSpaceEventHandler.PositionedEvent) {
        this.isMouseDown = false
        const r = this.GetPickAndPosition(e.position)
        if (r.pick && r.pick.id && r.pick.id.type == "Point") {
            const point = r.pick.id.body as Point
            point.OnMouseUp()
        }
        if (this.currentDragPoint != null) {
            this.currentDragPoint.OnDragEnd()
        }
        this.currentDragPoint = null
        this.EnableMapMove()
    }

    private MapMouseMove(e: Cesium.ScreenSpaceEventHandler.MotionEvent) {
        const r = this.GetPickAndPosition(e.endPosition)
        if (r.pick && r.pick.id && r.pick.id.type == "Point") {
            const point = r.pick.id.body as Point
            point.OnMouseMove(this.isMouseDown)
        }
        if (this.isMouseDown) {
            if (this.currentDragPoint != null) {
                this.DisableMapMove()
                if (r.tp) {
                    this.currentDragPoint.OnDragging(r.tp)
                    this.Updateline()
                }
            }
        }
    }

    private GetPointsPath() {
        let path: Array<Cesium.Cartesian3> = []
        for (let p of this.points.value) {
            //@ts-ignore
            path.push(p[1].body.position.getValue(new Cesium.JulianDate()) as Cesium.Cartesian3)
        }
        return path
    }

    private Updateline() {
        if (this.points.value.size > 1) {
            this.line.Update(this.GetPointsPath())
        }
    }

    private AddPoint(p: Cesium.Cartesian3) {
        const point = new Point({ atlas: this, position: p })
        this.points.value.set(point.UID, point)
    }

    /**
     * 禁止地图移动
     */
    private DisableMapMove() {
        if (this.viewer) {
            this.viewer.scene.screenSpaceCameraController.enableTranslate = false
            this.viewer.scene.screenSpaceCameraController.enableRotate = false
            this.viewer.scene.screenSpaceCameraController.enableZoom = false
            this.viewer.scene.screenSpaceCameraController.enableTilt = false
            this.viewer.scene.screenSpaceCameraController.enableLook = false
        }
    }

    /**
     * 开启地图移动
     */
    private EnableMapMove() {
        if (this.viewer) {
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true
            this.viewer.scene.screenSpaceCameraController.enableRotate = true
            this.viewer.scene.screenSpaceCameraController.enableZoom = true
            this.viewer.scene.screenSpaceCameraController.enableTilt = true
            this.viewer.scene.screenSpaceCameraController.enableLook = true
        }
    }

    /**
     * 变换摄影机位置
     */
    private ToTargetPosition(lng: number, lat: number, height = 1600) {
        if (this.viewer) {
            let result = Cesium.Cartesian3.fromDegrees(lng, lat, height)
            this.viewer.scene.camera.flyTo({ destination: result, complete: () => { } })
        }
    }

    private GetPickAndPosition(sp: Cesium.Cartesian2) {
        const pick = this.viewer.scene.pick(sp)
        let tp = this.viewer.scene.pickPosition(sp)
        return { pick, tp }
    }

    /**
     * 获取经纬度 ( 输入c3 )
     */
    public GetLngLatFromC3(c3: Cesium.Cartesian3): { R: number, Q: number, H: number } {
        if (this.viewer) {
            let cartographic = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(c3)
            let R = Cesium.Math.toDegrees(cartographic.longitude)
            let Q = Cesium.Math.toDegrees(cartographic.latitude)
            return { R, Q, H: cartographic.height }
        }
        return { R: 0, Q: 0, H: 0 }
    }

    /**
     * 获取c3 ( 输入经纬度 )
     */
    public GetC3FromLngLat(lng: number, lat: number, height: number) {
        return Cesium.Cartesian3.fromDegrees(lng, lat, height)
    }
}

export { Atlas }