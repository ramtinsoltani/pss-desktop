import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AppService } from '@app/service/app';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {

  private diskSub: Subscription;
  private readySub: Subscription;

  public freeSpace: number = 0;
  public totalSpace: number = 0;
  public usedSpaceRatio: number = 0;

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  private recalcDiskSpace(): void {

    this.app.disk()
    .then(info => {

      this.freeSpace = Math.floor(info.free / (1000 * 1000 * 1000));
      this.totalSpace = Math.floor(info.total / (1000 * 1000 * 1000));
      this.usedSpaceRatio = Math.floor(((info.total - info.free) * 100) / info.total);
      this.detector.detectChanges();

    })
    .catch(console.error);

  }

  ngOnInit() {

    this.diskSub = this.app.onDiskSpaceRecalcNeeded.subscribe(() => this.recalcDiskSpace());

    this.readySub = this.app.isReady.subscribe(ready => {

      if ( ! ready ) return;

      if ( this.readySub && ! this.readySub.closed ) this.readySub.unsubscribe();
      else if ( ! this.readySub ) setTimeout(() => this.readySub.unsubscribe(), 100);

      this.recalcDiskSpace();

    });

  }

  ngOnDestroy() {

    if ( this.diskSub && ! this.diskSub.closed ) this.diskSub.unsubscribe();
    if ( this.readySub && ! this.readySub.closed ) this.readySub.unsubscribe();

  }

}
