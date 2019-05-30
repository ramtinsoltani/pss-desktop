import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AppService } from '@app/service/app';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;

  public root: boolean = true;
  public currentPath: string;

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    this.pathSub = this.app.onPathUpdated.subscribe(() => {

      this.currentPath = this.app.currentPath;
      this.root = this.currentPath === '';
      this.detector.detectChanges();

    });

  }

  public cdBack(): void {

    if ( this.root ) return;

    this.app.cdBack()
    .catch(console.error);

  }

  ngOnDestroy() {

    if ( this.pathSub && ! this.pathSub.closed ) this.pathSub.unsubscribe();

  }

}
